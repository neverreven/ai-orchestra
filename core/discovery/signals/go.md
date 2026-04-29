# Signal: go (Go / Golang)

> Generic detection in v1. Stack pack content arrives in v1.1+. Detected projects receive the universal core only.

**Stack id:** `go`
**Stack pack:** _none in v1; `core/stack-packs/go/` reserved for v1.1+_

## Strong signals (weight 3 each)

| Signal | Match | Notes |
|--------|-------|-------|
| `go.mod` exists at root | File presence | Definitive Go module marker. |

## Medium signals (weight 2 each)

| Signal | Match |
|--------|-------|
| `go.sum` exists at root | Module checksum file. |
| `cmd/`, `internal/`, or `pkg/` directories present | Conventional Go project layout. |

## Weak signals (weight 1 each)

| Signal | Match |
|--------|-------|
| Any `*.go` file in tracked code | Excluding `vendor/`, `_test/`, `dist/`. |
| `vendor/` directory present | Vendored dependencies. |
| `.golangci.yml` or `.golangci.yaml` present | Lint config. |
| `Makefile` with `go build` / `go test` targets | Common Go project orchestration. |

## Detected frameworks (informational, no stack pack consumption in v1)

| Framework | Match |
|-----------|-------|
| `gin` | `github.com/gin-gonic/gin` in `go.mod`. |
| `echo` | `github.com/labstack/echo` in `go.mod`. |
| `fiber` | `github.com/gofiber/fiber` in `go.mod`. |
| `chi` | `github.com/go-chi/chi` in `go.mod`. |
| `gorm` | `gorm.io/gorm` in `go.mod`. |
| `cobra` | `github.com/spf13/cobra` in `go.mod` (CLI projects). |

## Test framework detection

Go's standard library provides `testing`. Detect it by presence of `*_test.go` files. Detect popular extensions:

| Test framework | Match |
|----------------|-------|
| `testify` | `github.com/stretchr/testify` in `go.mod`. |
| `ginkgo` | `github.com/onsi/ginkgo` in `go.mod`. |
| `gomega` | `github.com/onsi/gomega` in `go.mod`. |

## Notes

In v1, a Go project receives the universal core (director, learnings, audit, generic role skills) without stack-specific guidance. The plan should clearly note this gap.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.
