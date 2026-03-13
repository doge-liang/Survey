---
name: semantic-scholar-api
description: |
  Use when interacting with Semantic Scholar API for academic paper search, metadata retrieval, citation analysis, or author lookup. Provides complete API reference including endpoints, parameters, rate limits, and error handling.
---

# Semantic Scholar API

Complete reference for Semantic Scholar Academic Graph API, Recommendations API, and Datasets API.

---

## Quick Start

### Base URLs

| API | Base URL | Purpose |
|-----|----------|---------|
| Academic Graph | `https://api.semanticscholar.org/graph/v1` | Papers, authors, citations |
| Recommendations | `https://api.semanticscholar.org/recommendations/v1` | Paper recommendations |
| Datasets | `https://api.semanticscholar.org/datasets/v1` | Bulk data downloads |

### Authentication

```bash
# Optional but recommended for higher rate limits
export SEMANTIC_SCHOLAR_API_KEY="your-api-key"

# Use in request header
curl -H "x-api-key: $SEMANTIC_SCHOLAR_API_KEY" \
  "https://api.semanticscholar.org/graph/v1/paper/search?query=transformers"
```

### Rate Limits

| Authentication | Limit | Best Practice |
|----------------|-------|---------------|
| No API Key | 100 req/5min | Batch requests, add delays |
| With API Key | 5000 req/5min (1 req/sec) | Use batch endpoints |

---

## Common Operations

### 1. Search Papers

**Endpoint:** `GET /paper/search` (relevance) or `/paper/search/bulk` (bulk)

```bash
# Basic search
curl "https://api.semanticscholar.org/graph/v1/paper/search?query=transformers&fields=title,authors,year"

# With filters
curl "https://api.semanticscholar.org/graph/v1/paper/search/bulk?query=\"generative ai\"&fields=title,abstract,citationCount&year=2023-"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | **Required.** Search term. Supports operators: `\|`, `+`, `-`, `""`, `*`, `~` |
| `fields` | string | Comma-separated fields to return |
| `limit` | int | Max results (default: 10, max: 100) |
| `offset` | int | Pagination offset |
| `year` | string | Year range (e.g., `2020-2023` or `2023-`) |
| `publicationTypes` | string | Filter by type: `JournalArticle`, `Conference`, etc. |
| `openAccessPdf` | bool | Filter for papers with open access PDF |
| `minCitationCount` | int | Minimum citation count |

**Search Query Syntax:**

```
((cloud computing) | virtualization) +security -privacy   # OR, AND, NOT
"red blood cell" + artificial intelligence               # Exact phrase
fish*                                                     # Prefix wildcard
bugs~3                                                    # Fuzzy match (edit distance)
"blue lake" ~3                                            # Proximity search
```

### 2. Get Paper Details

**Endpoint:** `GET /paper/{paper_id}`

```bash
# Single paper
curl "https://api.semanticscholar.org/graph/v1/paper/649def34f8be52c8b66281af98ae884c09aef38b?fields=title,abstract,year,citationCount,openAccessPdf"

# Batch papers (POST)
curl -X POST "https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,authors" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["paperId1", "paperId2"]}'
```

**Paper ID Formats:**
- Semantic Scholar ID: `649def34f8be52c8b66281af98ae884c09aef38b`
- arXiv: `arXiv:1706.03762`
- DOI: `DOI:10.1234/example`
- Corpus ID: `CorpusID:12345678`

**Common Fields:**

| Field | Description |
|-------|-------------|
| `title` | Paper title |
| `authors` | Author list (use `authors.name` for details) |
| `abstract` | Paper abstract |
| `year` | Publication year |
| `citationCount` | Total citations |
| `referenceCount` | Total references |
| `influentialCitationCount` | Highly influential citations |
| `openAccessPdf` | Open access PDF URL and status |
| `publicationVenue` | Journal/conference name |
| `fieldsOfStudy` | Research fields |
| `s2FieldsOfStudy` | S2-specific fields |
| `embedding` | Paper embedding vector |

### 3. Get Citations & References

**Endpoints:**
- `GET /paper/{id}/citations` - Papers that cite this paper
- `GET /paper/{id}/references` - Papers this paper cites

```bash
# Get citations
curl "https://api.semanticscholar.org/graph/v1/paper/{paper_id}/citations?fields=title,authors,year&limit=100"

# Get references
curl "https://api.semanticscholar.org/graph/v1/paper/{paper_id}/references?fields=title,authors,year&limit=100"
```

### 4. Get Paper Recommendations

**Endpoint:** `POST /recommendations/v1/papers`

```bash
curl -X POST "https://api.semanticscholar.org/recommendations/v1/papers?fields=title,citationCount&limit=100" \
  -H "Content-Type: application/json" \
  -d '{
    "positivePaperIds": ["paperId1", "paperId2"],
    "negativePaperIds": ["paperId3"]
  }'
```

**Single Paper Recommendation:**
```bash
curl "https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}?fields=title&limit=100"
```

### 5. Author Lookup

**Endpoint:** `GET /author/{author_id}` or `POST /author/batch`

```bash
# Single author
curl "https://api.semanticscholar.org/graph/v1/author/{author_id}?fields=name,paperCount,hIndex"

# Batch authors
curl -X POST "https://api.semanticscholar.org/graph/v1/author/batch?fields=name,papers" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["authorId1", "authorId2"]}'
```

**Author Fields:**

| Field | Description |
|-------|-------------|
| `name` | Author name |
| `paperCount` | Number of papers |
| `citationCount` | Total citations received |
| `hIndex` | H-index metric |
| `papers` | List of papers (with `paperId`, `title`) |

---

## Pagination

### Offset-based (paper search)

```python
offset = 0
limit = 100
all_results = []

while True:
    response = requests.get(
        f"{base_url}/paper/search",
        params={"query": "transformers", "offset": offset, "limit": limit}
    ).json()
    
    all_results.extend(response.get("data", []))
    
    if len(response.get("data", [])) < limit:
        break
    offset += limit
```

### Token-based (bulk search)

```python
response = requests.get(f"{base_url}/paper/search/bulk?query=ai").json()

while True:
    # Process data
    for paper in response.get("data", []):
        process(paper)
    
    # Get next batch
    if "token" not in response:
        break
    response = requests.get(f"{base_url}/paper/search/bulk?token={response['token']}").json()
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 400 | Bad Request | Check query parameters |
| 401 | Unauthorized | Invalid API key |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limited - wait and retry |
| 500 | Internal Server Error | Server error - retry later |

### Error Response Format

```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the rate limit. Please wait before making more requests."
}
```

### Retry Strategy

```python
import time

def api_request_with_retry(url, headers=None, max_retries=3):
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            wait_time = 2 ** attempt  # Exponential backoff
            time.sleep(wait_time)
        else:
            response.raise_for_status()
    
    raise Exception("Max retries exceeded")
```

---

## Optimization Tips

### 1. Use API Key
- Gets dedicated rate limit (1 req/sec)
- Not affected by other unauthenticated users
- Apply at: https://www.semanticscholar.org/product/api

### 2. Use Batch Endpoints
- `/paper/batch` - Get multiple papers in one request
- `/author/batch` - Get multiple authors in one request
- `/paper/search/bulk` - Efficient bulk search with token pagination

### 3. Limit Fields
- Only request fields you need
- Reduces response size and improves speed

### 4. Download Datasets
- For large-scale analysis, use Datasets API
- Download full dumps instead of API calls
- Endpoint: `GET /datasets/v1/release/latest`

---

## Python Examples

### Complete Search & Analysis Workflow

```python
import requests
import json
import time

API_KEY = "your-api-key"  # Optional
BASE_URL = "https://api.semanticscholar.org/graph/v1"

headers = {"x-api-key": API_KEY} if API_KEY else {}

def search_papers(query, year=None, limit=100):
    """Search papers with optional year filter."""
    params = {
        "query": query,
        "fields": "title,authors,year,abstract,citationCount,openAccessPdf",
        "limit": limit
    }
    if year:
        params["year"] = year
    
    response = requests.get(f"{BASE_URL}/paper/search", 
                          params=params, headers=headers)
    response.raise_for_status()
    return response.json().get("data", [])

def get_paper_details(paper_id):
    """Get detailed paper information."""
    fields = "title,authors,year,abstract,citationCount,referenceCount,openAccessPdf"
    response = requests.get(
        f"{BASE_URL}/paper/{paper_id}?fields={fields}",
        headers=headers
    )
    response.raise_for_status()
    return response.json()

def get_citations(paper_id, limit=100):
    """Get papers citing this paper."""
    response = requests.get(
        f"{BASE_URL}/paper/{paper_id}/citations",
        params={"fields": "title,authors,year", "limit": limit},
        headers=headers
    )
    response.raise_for_status()
    return response.json().get("data", [])

def get_recommendations(seed_paper_ids, limit=50):
    """Get paper recommendations based on seed papers."""
    response = requests.post(
        f"https://api.semanticscholar.org/recommendations/v1/papers",
        params={"fields": "title,authors,year,citationCount", "limit": limit},
        json={"positivePaperIds": seed_paper_ids},
        headers=headers
    )
    response.raise_for_status()
    return response.json().get("recommendedPapers", [])

# Example usage
if __name__ == "__main__":
    # Search for papers
    papers = search_papers("attention mechanism transformers", year="2020-")
    print(f"Found {len(papers)} papers")
    
    # Get details for first paper
    if papers:
        paper_id = papers[0]["paperId"]
        details = get_paper_details(paper_id)
        print(f"Citations: {details.get('citationCount', 0)}")
        
        # Get citing papers
        citations = get_citations(paper_id, limit=10)
        print(f"Top citations: {len(citations)}")
```

---

## Anti-Patterns

1. **Don't ignore rate limits** - Implement backoff and caching
2. **Don't request all fields** - Only ask for what you need
3. **Don't make sequential calls** - Use batch endpoints
4. **Don't skip error handling** - Handle 429, 404, 500 appropriately
5. **Don't hardcode paper IDs** - Use search or resolve from arXiv/DOI

---

## Resources

- **API Documentation:** https://api.semanticscholar.org/api-docs/
- **Tutorial:** https://www.semanticscholar.org/product/api/tutorial
- **Get API Key:** https://www.semanticscholar.org/product/api
- **GitHub Examples:** https://github.com/allenai/s2-folks
- **Postman Collection:** Available in tutorial
