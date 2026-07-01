---
name: hf-daily-papers
description: Fetches daily research papers from the Hugging Face Daily Papers feed to help summarize trending AI/ML literature, research papers, and find arXiv links.
---

# Hugging Face Daily Papers Skill

This skill enables the agent to query and retrieve the latest research papers featured on the Hugging Face Daily Papers page (https://huggingface.co/papers).

## Configuration & Integration

This skill works in tandem with the project-level MCP server configured in the root `.mcp.json` file:
* **Server Name:** `huggingface-daily-papers`
* **Command:** `uvx huggingface-daily-paper-mcp`

Alternatively, if MCP is not active, the agent can fetch from the public Hugging Face Daily Papers API endpoint:
`https://huggingface.co/api/daily_papers?limit=10`

## Custom Tools & Stdio Commands

You can run the MCP server manually or query the API directly:

### 1. Using the MCP Tools
* `get_today_papers()`: Fetches papers from the current date.
* `get_yesterday_papers()`: Fetches papers from the previous day.
* `get_papers_by_date(date)`: Fetches papers for a specific date (format: `YYYY-MM-DD`).

### 2. Using HTTP Requests (API Fallback)
```bash
curl -s "https://huggingface.co/api/daily_papers?limit=10"
```

## How to Handle Daily Papers

When requested to fetch or summarize the latest papers:
1. Use the MCP server tools (`get_today_papers` or `get_yesterday_papers`).
2. Fall back to calling the API endpoint `https://huggingface.co/api/daily_papers` using standard HTTP or `curl`.
3. Format the response as a clean Markdown list of papers, including:
   - **Title**
   - **Authors**
   - **Upvotes / Likes**
   - **Direct arXiv PDF URL** (format: `https://arxiv.org/pdf/{arxiv_id}`)
   - **Hugging Face Paper URL** (format: `https://huggingface.co/papers/{arxiv_id}`)
   - **Brief Summary / Abstract**
