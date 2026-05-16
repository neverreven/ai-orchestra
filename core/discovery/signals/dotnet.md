# Signal: dotnet (.NET / C# / F#)

> Generic detection in v1. Stack pack content arrives in v1.1+.

**Stack id:** `dotnet`
**Stack pack:** _none in v1; `core/stack-packs/dotnet/` reserved for v1.1+_

## Strong signals (weight 3 each)

| Signal | Match | Notes |
|--------|-------|-------|
| Any `*.csproj`, `*.fsproj`, or `*.vbproj` file present | File presence | Project file. |
| Any `*.sln` (solution) file present | File presence | Solution file. |
| `global.json` exists at root | File presence | .NET SDK pin. |

## Medium signals (weight 2 each)

| Signal | Match |
|--------|-------|
| `Directory.Build.props` or `Directory.Build.targets` present | MSBuild conventions. |
| `nuget.config` present | NuGet feed configuration. |
| `bin/` and `obj/` directories present | MSBuild output (excluded from scans). |

## Weak signals (weight 1 each)

| Signal | Match |
|--------|-------|
| Any `*.cs`, `*.fs`, or `*.vb` file in tracked code | Excluding `bin/`, `obj/`, `packages/`. |
| `appsettings.json` or `appsettings.*.json` present | ASP.NET configuration files. |
| `.editorconfig` with .NET-specific rules | Common in .NET projects. |

## Detected frameworks (informational)

| Framework | Match |
|-----------|-------|
| `aspnetcore` | `*.csproj` references `Microsoft.AspNetCore.*`. |
| `entity-framework` | `Microsoft.EntityFrameworkCore.*` package references. |
| `xamarin-forms` | `Xamarin.Forms` package references. |
| `maui` | `Microsoft.Maui.*` package references (raises mobile relevance). |
| `blazor` | `Microsoft.AspNetCore.Components.*` references or `*.razor` files present. |
| `wpf` | `UseWPF=true` in csproj or `*.xaml` with WPF namespaces. |
| `winforms` | `UseWindowsForms=true` in csproj. |

## Test framework detection

| Test framework | Match |
|----------------|-------|
| `xunit` | `xunit` package reference. |
| `nunit` | `NUnit` package reference. |
| `mstest` | `MSTest.TestFramework` package reference. |

## Notes

In v1, a .NET project receives the universal core. MAUI / Xamarin projects also raise the `mobile` stack score.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.
