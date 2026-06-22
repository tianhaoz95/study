#!/usr/bin/env python3
# Usage: python scripts/download_papers.py
# Downloads all reference PDFs into references/; skips files that already exist.

import os
import sys
import urllib.request

REFERENCES_DIR = os.path.join(os.path.dirname(__file__), "..", "references")

PAPERS = {
    "perception-lm.pdf":                          "https://arxiv.org/pdf/2504.13180",
    "diffusion-gemma-transparency.pdf":          "https://arxiv.org/pdf/2606.20560",
    "joyai-vl-interaction.pdf":                  "https://arxiv.org/pdf/2606.14777v1",
    "loopcoder-v2.pdf":                          "https://arxiv.org/pdf/2606.18023",
    "loop-world-model.pdf":                      "https://arxiv.org/pdf/2606.18208",
    "opsd-overview.pdf":                         "https://arxiv.org/pdf/2605.18141",
    "dasd.pdf":                                  "https://arxiv.org/pdf/2605.22263",
    "opsd-opd-survey.pdf":                       "https://arxiv.org/pdf/2604.13016",
    "d-opsd.pdf":                               "https://arxiv.org/pdf/2606.18195",
    "safespec.pdf":                             "https://arxiv.org/pdf/2606.19755",
    "uniar.pdf":                                "https://arxiv.org/pdf/2606.18249",
    "reves.pdf":                                 "https://arxiv.org/pdf/2606.18910",
    "soft-moe.pdf":                             "https://arxiv.org/pdf/2606.17952",
    "kveraser.pdf":                             "https://arxiv.org/pdf/2606.17034v1",
    "vibethinker-3b.pdf":                        "https://arxiv.org/pdf/2606.16140",
    "dream-reasoner.pdf":                       "https://arxiv.org/pdf/2606.19257v1",
    "sumi-udlm.pdf":                            "https://arxiv.org/pdf/2606.19005",
    "decentmem.pdf":                            "https://arxiv.org/pdf/2605.22721",
    "self-harness.pdf":                        "https://arxiv.org/pdf/2606.09498v1",
    "llada2.1.pdf":                           "https://arxiv.org/pdf/2602.08676",
    "llada2.0.pdf":                           "https://arxiv.org/pdf/2512.15745",
    "loop-mdm.pdf":                           "https://arxiv.org/pdf/2605.26106",
    "deepseek-v3.pdf":                       "https://arxiv.org/pdf/2512.02556",
    "veca-elastic-core-attention.pdf":       "https://arxiv.org/pdf/2605.12491",
    "smt.pdf":                               "https://arxiv.org/pdf/2606.18216",
    "low-rank-data-selection.pdf":           "https://arxiv.org/pdf/2606.16045v1",
    "state-distribution-post-training.pdf":  "https://arxiv.org/pdf/2605.22731",
    "buy-kv-cache.pdf":                      "https://arxiv.org/pdf/2606.13361",
    "evods.pdf":                             "https://arxiv.org/pdf/2606.03841v1",
    "mtp-speculative-decoding.pdf":          "https://arxiv.org/pdf/2602.15763",
    "specforge-drafter-training.pdf":        "https://arxiv.org/pdf/2603.18567",
    "agi-to-asi.pdf":                        "https://arxiv.org/pdf/2606.12683",
    "lfm2.pdf":                               "https://arxiv.org/pdf/2511.23404",
    "ltc-networks.pdf":                       "https://arxiv.org/pdf/2006.04439",
    "cfc-networks.pdf":                       "https://arxiv.org/pdf/2106.13898",
    "llm-sleep.pdf":                          "https://arxiv.org/pdf/2606.01802",
    "bebop-mtp-rl.pdf":                      "https://arxiv.org/pdf/2606.03979",
    "llm-reasoning-rl.pdf":                  "https://arxiv.org/pdf/2606.07527",
    "bebop-mtp-rl.pdf":                      "https://arxiv.org/pdf/2606.12370",
    "prefilling-dllm.pdf":                   "https://arxiv.org/pdf/2606.10537",
    "smt-rnn.pdf":                           "https://arxiv.org/pdf/2606.09079",
    "opdlm.pdf":                             "https://arxiv.org/pdf/2606.06712",
    "world-model-rl.pdf":                    "https://arxiv.org/pdf/2606.06479",
    "nitp.pdf":                              "https://arxiv.org/pdf/2605.24956",
    "streaming-attention-tight-bounds.pdf":  "https://arxiv.org/pdf/2606.07205",
    "lejepa-identifiability.pdf":            "https://arxiv.org/pdf/2605.26379",
    "memory-caching-rnn.pdf":                "https://arxiv.org/pdf/2602.24281",
    "slingshot-nfi.pdf":                     "https://arxiv.org/pdf/2605.06152",
    "dft-reward-rectification.pdf":          "https://arxiv.org/pdf/2508.05629",
    "eagle2.pdf":                            "https://arxiv.org/pdf/2406.16858",
    "cola-depth-adaptation.pdf":             "https://arxiv.org/pdf/2507.07996",
    "dmoe-block-moe.pdf": "https://arxiv.org/pdf/2605.30876",
    "opd-horizon-control.pdf": "https://arxiv.org/pdf/2605.31490",
    "latent-space-survey.pdf":                 "https://arxiv.org/pdf/2604.02029",
    "representation-forcing.pdf":              "https://arxiv.org/pdf/2605.31604",
    "muon-curvature.pdf":                      "https://arxiv.org/pdf/2606.04662",
    "oprd.pdf":                                "https://arxiv.org/pdf/2606.06021",
    "muon.pdf":                                "https://arxiv.org/pdf/2502.16982",
    "draft-opd.pdf":                           "https://arxiv.org/pdf/2605.29343v1",
    "tropd.pdf":                               "https://arxiv.org/pdf/2606.01249",
    "gemini-embedding-2.pdf":                  "https://arxiv.org/pdf/2605.27295",
    "simsd.pdf":                               "https://arxiv.org/pdf/2606.02544",
    "why-larger-models-learn-more.pdf":        "https://arxiv.org/pdf/2605.29548v1",
    "cosmos3.pdf":                             "https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf",
    "sdsl-spec-decoding.pdf":                  "https://arxiv.org/pdf/2603.11053",
    "opd-foresight.pdf":                       "https://arxiv.org/pdf/2605.11739",
    "empirical-bayes-attention.pdf":           "https://arxiv.org/pdf/2605.27028",
    "rtpurbo.pdf":                             "https://arxiv.org/pdf/2605.20613",
    "domino-spec-decoding.pdf":                "https://arxiv.org/pdf/2605.29707v1",
    "oryx-multi-mixer.pdf":                    "https://arxiv.org/pdf/2605.28769",
    "opd-local-support-matching.pdf":          "https://arxiv.org/pdf/2603.25562",
    "attention-empirical-bayes.pdf":           "https://arxiv.org/pdf/2605.29351",
    "kv-cache-compression.pdf":               "https://arxiv.org/pdf/2605.16928",
    "diffusion-opd.pdf":                      "https://arxiv.org/pdf/2605.15055v1",
    "tide-dllm.pdf":                          "https://arxiv.org/pdf/2604.26951",
    "rrattention.pdf":                        "https://arxiv.org/pdf/2602.05853",
    "nvfp4-pretraining.pdf":                  "https://arxiv.org/pdf/2509.25149",
    "orthrus.pdf":                            "https://arxiv.org/pdf/2605.12825",
    "bitlm.pdf":                              "https://arxiv.org/pdf/2605.11577",
    "replaid.pdf":                            "https://arxiv.org/pdf/2605.18530",
    "llm-benchmark-bias.pdf":                 "https://arxiv.org/pdf/2605.24217",
    "sparse-to-dense-reward.pdf":             "https://arxiv.org/pdf/2605.12483",
    "longcat-flash.pdf":                      "https://arxiv.org/pdf/2509.01322",
    "a-bitter-lesson-for-data-filtering.pdf": "https://arxiv.org/pdf/2605.19407",
    "cola-dlm.pdf":                            "https://arxiv.org/pdf/2605.06548",
    "dynamo-llm.pdf":                          "https://arxiv.org/pdf/2408.00741",
    "ELF.pdf":                                 "https://arxiv.org/pdf/2605.10938",
    "fast-byte-latent-transformer.pdf":        "https://arxiv.org/pdf/2605.08044",
    "gated-deltanet-2.pdf":                    "https://arxiv.org/pdf/2605.22791",
    "the-many-faces-of-opd.pdf":               "https://arxiv.org/pdf/2605.11182",
    "oscar.pdf":                               "https://arxiv.org/pdf/2605.17757",
    "representation-autoencoders.pdf":         "https://arxiv.org/pdf/2605.18324",
    "tiny-recursive-model.pdf":               "https://arxiv.org/pdf/2605.19943",
    "eagle-3.pdf":                             "https://arxiv.org/pdf/2503.01840",
    "dpsk-v3.pdf":                             "https://arxiv.org/pdf/2412.19437",
    "dflash.pdf":                              "https://arxiv.org/pdf/2602.06036",
    "p-eagle.pdf":                             "https://arxiv.org/pdf/2602.01469",
    "DART.pdf":                                "https://arxiv.org/pdf/2601.19278",
}

def download(filename, url, dest_dir):
    path = os.path.join(dest_dir, filename)
    if os.path.exists(path):
        print(f"  skip  {filename}")
        return
    print(f"  fetch {filename}  ← {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp, open(path, "wb") as f:
        f.write(resp.read())
    print(f"        saved ({os.path.getsize(path) // 1024} KB)")

def main():
    os.makedirs(REFERENCES_DIR, exist_ok=True)
    errors = []
    for filename, url in PAPERS.items():
        try:
            download(filename, url, REFERENCES_DIR)
        except Exception as e:
            print(f"  ERROR {filename}: {e}", file=sys.stderr)
            errors.append(filename)
    if errors:
        print(f"\n{len(errors)} failed: {', '.join(errors)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
