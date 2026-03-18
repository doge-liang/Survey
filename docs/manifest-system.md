# Manifest System Documentation

> Documentation for the Survey project manifest system used to track research artifacts and their metadata.

## Overview

The manifest system provides structured metadata for all generated research reports, enabling:
- **Traceability**: Link inputs (source repos) to outputs (research reports)
- **Reproducibility**: Record exact versions, timestamps, and processing parameters
- **Discoverability**: Tag-based filtering and relationship mapping
- **Quality Assurance**: Validation against JSON Schema

## Architecture

```
research/github/{owner}/{repo}/
├── README.md          # Generated research report
└── manifest.json      # Metadata and provenance
```

## Schema

See `data/schemas/manifest.json` for the complete JSON Schema (v7).

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Manifest schema version (semantic versioning) |
| `generated_at` | string | ISO 8601 timestamp |
| `source` | object | Input source specification |
| `outputs` | array | List of generated artifacts |

### Example Manifest

```json
{
  "version": "1.0.0",
  "generated_at": "2026-03-17T10:30:00Z",
  "source": {
    "type": "github",
    "url": "https://github.com/karpathy/nanoGPT",
    "commit": "a3d3655",
    "cloned_at": "2026-03-10T08:00:00Z"
  },
  "inputs": [
    {
      "path": "sources/github/karpathy/nanoGPT",
      "type": "directory",
      "description": "Cloned repository"
    }
  ],
  "outputs": [
    {
      "path": "research/github/karpathy/nanoGPT/README.md",
      "type": "markdown",
      "description": "Research report"
    },
    {
      "path": "research/github/karpathy/nanoGPT/manifest.json",
      "type": "json",
      "description": "This manifest"
    }
  ],
  "metadata": {
    "tool": "github-researcher",
    "tool_version": "1.0.0",
    "processing_time_seconds": 120,
    "tags": ["llm", "training", "educational"],
    "language": "python"
  }
}
```

## Validation

### Using the TypeScript Library

```typescript
import { validateManifest, Manifest } from '../scripts/lib/manifest';

// Validate a manifest object
const manifest: Manifest = /* ... */;
const result = validateManifest(manifest);

if (result.valid) {
  console.log('✅ Manifest is valid');
} else {
  console.error('❌ Validation errors:', result.errors);
}
```

### Using Command Line

```bash
# Validate a specific manifest
bun scripts/validate-manifest.ts research/github/karpathy/nanoGPT/manifest.json

# Validate all manifests
bun scripts/validate-manifest.ts --all
```

## Workflow Integration

### Generation (github-researcher skill)

1. Clone/analyze source repository
2. Generate research report (README.md)
3. Create manifest.json with metadata
4. Validate manifest against schema
5. Write both files to `research/github/{owner}/{repo}/`

### Consumption (survey-synthesizer skill)

1. Discover available reports via manifest.json
2. Filter by tags, language, date range
3. Read report content + metadata
4. Generate synthesis with provenance tracking

## Version History

### v1.0.0 (2026-03-17)

- Initial schema release
- Support for GitHub source tracking
- Basic metadata (tags, language, processing time)
- JSON Schema v7 validation

## Best Practices

1. **Always validate** manifests after generation
2. **Use semantic versioning** for schema updates
3. **Include all outputs** in the manifest
4. **Record accurate timestamps** in ISO 8601 format
5. **Tag consistently** using controlled vocabulary

## Troubleshooting

### Manifest validation fails

1. Check all required fields are present
2. Verify timestamps are ISO 8601 format
3. Ensure paths are relative to repository root
4. Validate against schema: `bun scripts/validate-manifest.ts`

### Missing manifest.json

Regenerate the report using github-researcher skill:
```
research karpathy/nanoGPT
```

## References

- Schema: `data/schemas/manifest.json`
- TypeScript types: `scripts/lib/manifest.ts`
- Validation script: `scripts/validate-manifest.ts`
