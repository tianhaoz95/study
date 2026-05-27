# SpecForge — Gemma 4 MTP Training Extension

Extend [SpecForge](https://github.com/sgl-project/SpecForge) (SGLang's speculative-decoding training
framework) to support Gemma 4's Q-only K/V-sharing MTP architecture. The existing infrastructure —
optimizer, LR scheduler, distributed setup, data pipeline, Triton loss kernel — is reused unchanged.
The delta is **six targeted files (~400 lines of new code)**.

---

## Overview of changes

| File | Role | Status |
|------|------|--------|
| `specforge/modeling/target/custom_backend/gemma4.py` | Frozen Gemma 4 backend; forward hooks capture K, V from the SWA and full-attention layers | **New** |
| `specforge/modeling/draft/gemma4_assistant.py` | Q-only transformer; W_Q-only attention receives K, V as external inputs | **New** |
| `specforge/core/gemma4_mtp.py` | Training loop; wires target K/V into draft, reuses `LogSoftmaxLoss` | **New** |
| `specforge/modeling/auto.py` | Three registration lines | **+3 lines** |
| `configs/gemma4-27b-mtp.json` | Draft model hyperparameters and K/V layer indices | **New (JSON)** |
| `scripts/train_gemma4_mtp.py` | Entry point; mirrors `train_eagle3.py` except imports and one extra call | **New (~50 lines)** |

---

## Phase 1 — Repository setup

**Goal:** Working local copy of SpecForge with Gemma 4 weights accessible, all existing tests green.

### Steps

1. Clone SpecForge and install in editable mode:
   ```bash
   git clone https://github.com/sgl-project/SpecForge
   cd SpecForge
   pip install -e ".[dev]"
   ```

2. Verify an existing model runs end-to-end (smoke test with a small LLaMA or Qwen config):
   ```bash
   python scripts/train_eagle3.py --config configs/llama3-8b-eagle3.json --dry-run
   ```

3. Confirm the Gemma 4 target weights (27B) are accessible at a known local path or HF cache.
   Record the exact `swa_layer_idx` and `full_attn_layer_idx` values from the model config
   (expected: `swa_layer_idx=17`, `full_attn_layer_idx=35`).

### Verifiable result

- `python scripts/train_eagle3.py --dry-run` exits 0 with no import or runtime errors.
- `transformers.AutoModelForCausalLM.from_pretrained("<gemma4-path>")` loads without error.

---

## Phase 2 — Target model backend

**Goal:** A `Gemma4ForCausalLM` class that runs a frozen Gemma 4 forward pass and returns captured
K/V tensors plus soft-target logits, with no gradient leaking back through the backbone.

**File:** `specforge/modeling/target/custom_backend/gemma4.py`

### Steps

1. Subclass `Eagle3TargetModel` (already handles weight loading and `@torch.no_grad()` scaffolding).

2. Implement `set_kv_sharing_layers(swa_idx, full_idx)` to register the two layer indices:
   ```python
   def set_kv_sharing_layers(self, swa_idx: int, full_idx: int):
       self._kv_layers = {"sliding_attention": swa_idx, "full_attention": full_idx}
   ```

3. Override `forward` to register temporary `register_forward_hook` handles on
   `model.model.layers[idx].self_attn` for each registered layer, capture `(K, V)` from
   `out[1]` (the `present_key_value` slot), detach them, then remove hooks in a `finally` block.

4. Return a `Gemma4TargetOutput(kv_states, logits)` dataclass:
   ```
   kv_states: Dict[str, Tuple[Tensor, Tensor]]
     {"sliding_attention": (K, V), "full_attention": (K, V)}
   logits: Tensor  # soft targets for KL distillation
   ```

### Verifiable result

```python
target = Gemma4ForCausalLM.from_pretrained("<gemma4-path>")
target.set_kv_sharing_layers(swa_idx=17, full_idx=35)
out = target(input_ids=torch.randint(0, 262144, (1, 16)), attention_mask=torch.ones(1, 16))

assert set(out.kv_states.keys()) == {"sliding_attention", "full_attention"}
for k, v in out.kv_states.values():
    assert not k.requires_grad   # detached
    assert k.shape[-1] == 256    # head_dim
assert out.logits.shape == (1, 16, 262144)
```

---

## Phase 3 — Draft model: Q-only attention layer

**Goal:** A transformer block whose attention layers have W_Q only — no W_K, no W_V. K and V are
passed in as external tensors from the frozen backbone at every forward call.

**File:** `specforge/modeling/draft/gemma4_assistant.py`

### Steps

1. Implement `Gemma4AssistantAttention(nn.Module)`:
   - `__init__`: create only `self.q_proj = nn.Linear(hidden_size, num_heads * head_dim, bias=False)`.
     Do **not** create `k_proj` or `v_proj`.
   - `forward(hidden_states, key_states, value_states)`:
     - Project Q: reshape to `[B, n_heads, L, head_dim]`.
     - Call `F.scaled_dot_product_attention(q, key_states, value_states, attn_mask=None)`
       (bidirectional — no causal mask, because the drafter attends over the full context K/V).
     - Return `[B, L, hidden_size]`.

2. Implement `Gemma4AssistantLayer` wrapping `Gemma4AssistantAttention` + MLP + RMSNorm, with
   a `forward(hidden_states, kv_states)` signature that looks up the correct `(K, V)` pair from
   `kv_states` by layer type key.

3. Implement `Gemma4AssistantModel` (backbone) and `Gemma4AssistantForCausalLM` (adds centroid
   embedding head). `project_hidden_states` should be a no-op (identity) since K/V injection
   replaces the need for cross-attention projection.

### Verifiable result

```python
cfg = Gemma4AssistantConfig(hidden_size=2560, num_attention_heads=8,
                             num_hidden_layers=4, head_dim=256)
draft = Gemma4AssistantForCausalLM(cfg)

# Confirm no K/V projection weights exist
assert not hasattr(draft.model.layers[0].self_attn, "k_proj")
assert not hasattr(draft.model.layers[0].self_attn, "v_proj")

# Confirm forward runs with injected K/V
kv = {"sliding_attention": (torch.randn(1,8,16,256), torch.randn(1,8,16,256)),
      "full_attention":     (torch.randn(1,8,16,256), torch.randn(1,8,16,256))}
logits = draft(input_ids=torch.randint(0, 262144, (1, 16)), kv_states=kv)
assert logits.shape == (1, 16, 262144)
```

---

## Phase 4 — Training loop

**Goal:** An `OnlineGemma4MTPModel` that wires the target K/V tensors into the draft forward pass
and computes the distillation loss using the existing `LogSoftmaxLoss` Triton kernel.

**File:** `specforge/core/gemma4_mtp.py`

### Steps

1. Subclass or mirror `OnlineEagle3Model`. The three-step forward is:
   ```
   Step 1: target_out = target_model(input_ids, attention_mask)   # frozen, no grad
   Step 2: logits = draft_model(input_ids, kv_states=target_out.kv_states)
   Step 3: loss = LogSoftmaxLoss.apply(logits, softmax(target_out.logits).detach(), position_mask)
   ```

2. Ensure `target_model` is called inside `torch.no_grad()` (or the target is already wrapped —
   confirm this is the case from Phase 2's `@torch.no_grad()` on `forward`).

3. Reuse the TTT (Test-Time Training) unroll logic from `OnlineEagle3Model` unchanged — only the
   K/V wiring call differs.

4. Expose a `set_kv_sharing_layers(swa_idx, full_idx)` passthrough that delegates to
   `self.target_model.set_kv_sharing_layers(...)`.

### Verifiable result

```python
model = OnlineGemma4MTPModel(target_model=target, draft_model=draft)
model.set_kv_sharing_layers(swa_idx=17, full_idx=35)
loss = model(input_ids=torch.randint(0, 262144, (2, 32)),
             attention_mask=torch.ones(2, 32),
             position_ids=torch.arange(32).unsqueeze(0).expand(2, -1))
assert loss.ndim == 0          # scalar
assert loss.requires_grad      # grad flows through draft only
loss.backward()                # no error
```

---

## Phase 5 — Registration and config

**Goal:** SpecForge's `Auto*` dispatch classes resolve `"Gemma4AssistantForCausalLM"` to the
correct target backend, draft architecture, and config class, exactly as they do for EAGLE-3.

### Step 5a — Register in `specforge/modeling/auto.py` (+3 lines)

```python
# (a) Target model
from .custom_backend.gemma4 import Gemma4ForCausalLM
_model_mapping[Gemma4TextConfig] = [Gemma4ForCausalLM]

# (b) Draft architecture
from .draft.gemma4_assistant import Gemma4AssistantForCausalLM
_model_mapping[Gemma4TextConfig] = Gemma4AssistantForCausalLM   # draft registry key

# (c) Config mapping
_config_mapping["Gemma4AssistantForCausalLM"] = Gemma4TextConfig
```

### Step 5b — Draft config `configs/gemma4-27b-mtp.json`

```json
{
  "architectures": ["Gemma4AssistantForCausalLM"],
  "model_type": "gemma4_text",
  "hidden_size": 2560,
  "num_attention_heads": 8,
  "num_hidden_layers": 4,
  "head_dim": 256,
  "intermediate_size": 8192,
  "rms_norm_eps": 1e-6,
  "swa_layer_idx": 17,
  "full_attn_layer_idx": 35,
  "vocab_size": 262144,
  "torch_dtype": "bfloat16"
}
```

### Verifiable result

```python
from specforge.modeling.auto import AutoDistributedTargetModel, AutoEagle3DraftModel

target = AutoDistributedTargetModel.from_config("configs/gemma4-27b-mtp.json", target_path="<gemma4>")
draft  = AutoEagle3DraftModel.from_config("configs/gemma4-27b-mtp.json")

assert type(target).__name__ == "Gemma4ForCausalLM"
assert type(draft).__name__  == "Gemma4AssistantForCausalLM"
```

---

## Phase 6 — Entry point and end-to-end smoke test

**Goal:** A `scripts/train_gemma4_mtp.py` entry point that launches a training run (even just
one step on a small batch) with no errors, producing a checkpoint that SGLang can load.

### Steps

1. Copy `scripts/train_eagle3.py` verbatim, then make exactly two diffs:
   - Change the import: `from specforge.core.gemma4_mtp import OnlineGemma4MTPModel`
   - After building the model, add: `model.set_kv_sharing_layers(cfg.swa_layer_idx, cfg.full_attn_layer_idx)`

2. Run a single-step smoke test (CPU or single GPU, tiny batch):
   ```bash
   python scripts/train_gemma4_mtp.py \
     --config configs/gemma4-27b-mtp.json \
     --target-model <gemma4-path> \
     --max-steps 1 \
     --output-dir /tmp/gemma4-mtp-ckpt
   ```

3. Confirm the saved checkpoint has the expected draft model keys:
   ```bash
   python -c "
   import torch
   sd = torch.load('/tmp/gemma4-mtp-ckpt/model.pt', map_location='cpu')
   ks = list(sd.keys())
   assert any('q_proj' in k for k in ks), 'missing q_proj'
   assert not any('k_proj' in k for k in ks), 'unexpected k_proj'
   print('OK — checkpoint looks correct')
   "
   ```

4. Load the checkpoint into SGLang's speculative decoding runtime to confirm the K/V-sharing
   contract is preserved (same layer-type keys the runtime expects):
   ```bash
   python -m sglang.check_speculative_compat \
     --target <gemma4-path> \
     --draft /tmp/gemma4-mtp-ckpt
   ```

### Verifiable result

- `train_gemma4_mtp.py --max-steps 1` exits 0.
- Checkpoint contains `q_proj` weights and no `k_proj` / `v_proj` weights.
- SGLang compat check passes (or at minimum loads the draft config without key-mismatch errors).

---

## What is explicitly NOT changing

The following SpecForge components are reused byte-for-byte:

| Component | Why untouched |
|-----------|---------------|
| `AdamW` optimizer + LR scheduler | Standard; no architecture dependency |
| Tensor parallel + sequence parallel (USP) | Works on any `nn.Module` |
| `prepare_data.py` data pipeline | Token-level; model-agnostic |
| Triton `LogSoftmaxLoss` kernel | Takes `(logits, soft_targets, mask)` — unchanged interface |
| TTT unroll logic in `OnlineEagle3Model` | Shared base; only K/V wiring call is new |

The K/V-sharing contract — a `Dict[str, Tuple[Tensor, Tensor]]` keyed by layer type — is
identical between training (`OnlineGemma4MTPModel`) and SGLang inference, so checkpoints
trained here load directly into the runtime without conversion.
