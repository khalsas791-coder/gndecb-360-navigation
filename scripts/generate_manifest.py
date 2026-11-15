import os
import json
from PIL import Image

def build_manifest():
    public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
    output_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'panoramaManifest.json')
    public_manifest_path = os.path.join(public_dir, 'panorama-manifest.json')

    files = [f for f in sorted(os.listdir(public_dir)) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Scanning {len(files)} panorama files in {public_dir}...")

    manifest = {
        "version": "1.0.0",
        "cdnBaseUrl": "",  # Set via VITE_CDN_BASE_URL environment variable
        "defaultFallbackFormat": "jpeg",
        "resolutions": {
            "2k": {"width": 2048, "height": 1024, "target": "mobile"},
            "4k": {"width": 3840, "height": 1920, "target": "tablet_and_standard_desktop"},
            "8k": {"width": 7680, "height": 3840, "target": "high_dpi_desktop"}
        },
        "panoramas": {}
    }

    stats = {
        "native_8k": 0,
        "small_1600": 0,
        "intermediate": 0,
        "other": 0
    }

    for f in files:
        full_path = os.path.join(public_dir, f)
        base_id = os.path.splitext(f)[0]
        ext = os.path.splitext(f)[1].lower().replace('.', '')
        if ext == 'jpg': ext = 'jpeg'

        try:
            with Image.open(full_path) as img:
                w, h = img.width, img.height
                ratio = round(w / h, 3)

                # Determine categorization and available tiers
                if w == 7680 and h == 3840:
                    category = "native_8k"
                    tiers = ["2k", "4k", "8k"]
                    stats["native_8k"] += 1
                elif w == 1600 and h == 800:
                    category = "small_1600"
                    tiers = ["2k", "4k"]  # Upscaled to 4K max; do not upscale to 8K
                    stats["small_1600"] += 1
                elif (w in [1774, 2048] and h in [887, 1024]):
                    category = "intermediate"
                    tiers = ["2k", "4k"]
                    stats["intermediate"] += 1
                else:
                    category = "custom"
                    tiers = ["2k", "4k"] if w >= 2048 else ["2k"]
                    stats["other"] += 1

                manifest["panoramas"][base_id] = {
                    "id": base_id,
                    "filename": f,
                    "localPath": f"/{f}",
                    "nativeWidth": w,
                    "nativeHeight": h,
                    "aspectRatio": ratio,
                    "category": category,
                    "availableTiers": tiers,
                    "formats": ["avif", "webp", "jpeg"],
                    "cdnPath": f"panoramas/{base_id}"
                }
        except Exception as e:
            print(f"Warning: could not process {f}: {e}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f_out:
        json.dump(manifest, f_out, indent=2)

    with open(public_manifest_path, 'w', encoding='utf-8') as f_out:
        json.dump(manifest, f_out, indent=2)

    print(f"Manifest written successfully:")
    print(f"  - Total panoramas: {len(manifest['panoramas'])}")
    print(f"  - Native 8K (7680x3840): {stats['native_8k']}")
    print(f"  - Small 1600x800: {stats['small_1600']}")
    print(f"  - Intermediate (1774/2048): {stats['intermediate']}")
    print(f"  - Other: {stats['other']}")
    print(f"  - Output: {output_path}")

if __name__ == '__main__':
    build_manifest()
