#!/usr/bin/env python3
"""Build clean, verified distribution ZIPs of SmoothBoost for Chrome, Titanium Browser (Android), and Firefox."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


PROJECT_ROOT = Path(__file__).resolve().parents[1]

COMMON_PACKAGE_FILES = (
    "popup/popup.html",
    "popup/popup.css",
    "popup/popup.js",
    "popup/update-check.js",
    "scripts/background.js",
    "scripts/content.js",
    "scripts/page-hook.js",
    "scripts/compat.js",
    "data/site-rules.json",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
)

TARGET_CONFIGS = {
    "chrome": {
        "manifest_source": "manifest.json",
        "archive_name": "SmoothBoost-Chrome-{version}.zip",
        "description": "Chrome & Helium Desktop (Chromium MV3)",
        "create_legacy_alias": True,
    },
    "titanium-android": {
        "manifest_source": "manifest.json",
        "archive_name": "SmoothBoost-Titanium-Android-{version}.zip",
        "description": "Titanium Browser for Android (Chromium MV3 / Vanadium upstream)",
        "create_legacy_alias": False,
    },
    "firefox": {
        "manifest_source": "manifest.firefox.json",
        "archive_name": "SmoothBoost-Firefox-{version}.zip",
        "description": "Firefox Desktop (Gecko MV3 Event Pages)",
        "create_legacy_alias": False,
    },
    "firefox-android": {
        "manifest_source": "manifest.firefox.json",
        "archive_name": "SmoothBoost-Firefox-Android-{version}.zip",
        "description": "Firefox for Android (Gecko MV3 Mobile)",
        "create_legacy_alias": False,
    },
}


def verify_archive(archive_path: Path, expected_version: str) -> None:
    """Ensure generated ZIP is valid, parseable, and includes all required files."""
    if not archive_path.is_file() or archive_path.stat().st_size == 0:
        raise RuntimeError(f"Generated archive {archive_path.name} is empty or missing.")

    with ZipFile(archive_path, "r") as archive:
        names = set(archive.namelist())

        if "manifest.json" not in names:
            raise RuntimeError(f"{archive_path.name} is missing manifest.json")

        manifest_data = json.loads(archive.read("manifest.json").decode("utf-8"))
        if manifest_data.get("version") != expected_version:
            raise RuntimeError(
                f"{archive_path.name} manifest version mismatch: {manifest_data.get('version')} vs {expected_version}"
            )

        for required in COMMON_PACKAGE_FILES:
            if required not in names:
                raise RuntimeError(f"{archive_path.name} is missing required file: {required}")


def build_target(target_name: str, dist_dir: Path, custom_output: Path | None = None) -> list[Path]:
    config = TARGET_CONFIGS[target_name]
    manifest_source_path = PROJECT_ROOT / config["manifest_source"]

    if not manifest_source_path.is_file():
        raise SystemExit(f"Missing manifest source: {manifest_source_path}")

    manifest_json = json.loads(manifest_source_path.read_text(encoding="utf-8"))
    version = manifest_json["version"]

    missing = [name for name in COMMON_PACKAGE_FILES if not (PROJECT_ROOT / name).is_file()]
    if missing:
        raise SystemExit(f"Cannot package {target_name}; missing required files: {', '.join(missing)}")

    dist_dir.mkdir(parents=True, exist_ok=True)
    out_path = custom_output or (dist_dir / config["archive_name"].format(version=version))

    with ZipFile(out_path, "w", compression=ZIP_DEFLATED) as archive:
        # Write the appropriate manifest as manifest.json inside the ZIP root
        archive.write(manifest_source_path, arcname="manifest.json")
        for name in COMMON_PACKAGE_FILES:
            archive.write(PROJECT_ROOT / name, arcname=name)

    verify_archive(out_path, version)
    created = [out_path]

    # Create backwards-compatible legacy alias SmoothBoost-<version>.zip if requested
    if config.get("create_legacy_alias") and not custom_output:
        legacy_path = dist_dir / f"SmoothBoost-{version}.zip"
        with ZipFile(legacy_path, "w", compression=ZIP_DEFLATED) as archive:
            archive.write(manifest_source_path, arcname="manifest.json")
            for name in COMMON_PACKAGE_FILES:
                archive.write(PROJECT_ROOT / name, arcname=name)
        verify_archive(legacy_path, version)
        created.append(legacy_path)

    return created


def clean_old_versions(dist_dir: Path, current_version: str) -> list[str]:
    """Prune distribution ZIPs belonging to older versions."""
    removed = []
    if not dist_dir.is_dir():
        return removed
    for archive in dist_dir.glob("SmoothBoost-*.zip"):
        if not archive.name.endswith(f"-{current_version}.zip") and not archive.name.endswith(f"{current_version}.zip"):
            archive.unlink(missing_ok=True)
            removed.append(archive.name)
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        choices=["all", "chrome", "titanium-android", "firefox", "firefox-android"],
        default="all",
        help="Target platform to package (default: all)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Custom destination path (only valid with a single specific target)",
    )
    args = parser.parse_args()

    if args.output and args.target == "all":
        sys.exit("Error: --output cannot be specified when --target is 'all'")

    dist_dir = PROJECT_ROOT / "dist"
    targets_to_build = list(TARGET_CONFIGS.keys()) if args.target == "all" else [args.target]

    # Read current version from manifest.json to prune obsolete legacy archives
    manifest_source = json.loads((PROJECT_ROOT / "manifest.json").read_text(encoding="utf-8"))
    current_version = manifest_source.get("version", "")
    if current_version and not args.output:
        pruned = clean_old_versions(dist_dir, current_version)
        if pruned:
            print(f"Pruned {len(pruned)} obsolete release archive(s) from {dist_dir.name}/:")
            for old_name in pruned:
                print(f"  - {old_name}")
            print()

    print(f"Building SmoothBoost release targets: {', '.join(targets_to_build)}\n")
    all_created: list[Path] = []

    for target in targets_to_build:
        custom_out = args.output if (len(targets_to_build) == 1 and args.output) else None
        created = build_target(target, dist_dir, custom_out)
        all_created.extend(created)
        for path in created:
            size_kb = path.stat().st_size / 1024
            print(f"  ✓ [{target}] {path.name} ({size_kb:.1f} KB)")

    print(f"\nSuccessfully built {len(all_created)} release package(s) in {dist_dir}.")


if __name__ == "__main__":
    main()
