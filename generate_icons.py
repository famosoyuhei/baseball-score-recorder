#!/usr/bin/env python3
"""
アプリアイコンを各種サイズにリサイズするスクリプト
"""

from PIL import Image
import os

# 元のアイコンファイル
source_icon = "app_icon.png"

# 生成するアイコンサイズ（PWA標準サイズ）
icon_sizes = [
    72,   # Android Chrome
    96,   # Android Chrome
    128,  # Android Chrome
    144,  # Android Chrome
    152,  # iOS Safari
    192,  # Android Chrome
    384,  # Android Chrome
    512,  # Android Chrome
]

# Apple Touch Iconサイズ
apple_sizes = [
    120,  # iPhone
    152,  # iPad
    167,  # iPad Pro
    180,  # iPhone Plus
]

# Favicon用サイズ
favicon_sizes = [
    16,   # Favicon
    32,   # Favicon
    48,   # Favicon
]

def resize_icon(source_path, output_path, size):
    """アイコンをリサイズして保存"""
    try:
        img = Image.open(source_path)

        # RGBA モードに変換（透過対応）
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        # リサイズ（高品質）
        resized = img.resize((size, size), Image.Resampling.LANCZOS)

        # 保存
        resized.save(output_path, 'PNG', optimize=True)
        print(f"[OK] Generated: {output_path} ({size}x{size})")

    except Exception as e:
        print(f"[ERROR] Error generating {output_path}: {e}")

def main():
    # iconsディレクトリを作成
    os.makedirs("icons", exist_ok=True)

    print("Generating app icons...")
    print(f"Source: {source_icon}\n")

    # PWA用アイコン生成
    print("PWA Icons:")
    for size in icon_sizes:
        output_path = f"icons/icon-{size}x{size}.png"
        resize_icon(source_icon, output_path, size)

    # Apple Touch Icon生成
    print("\nApple Touch Icons:")
    for size in apple_sizes:
        output_path = f"icons/apple-touch-icon-{size}x{size}.png"
        resize_icon(source_icon, output_path, size)

    # デフォルトのApple Touch Icon（180x180）
    resize_icon(source_icon, "icons/apple-touch-icon.png", 180)

    # Favicon生成
    print("\nFavicons:")
    for size in favicon_sizes:
        output_path = f"icons/favicon-{size}x{size}.png"
        resize_icon(source_icon, output_path, size)

    # デフォルトのfavicon（32x32）
    resize_icon(source_icon, "favicon.ico", 32)

    print("\n[OK] Icon generation complete!")
    print(f"Generated {len(icon_sizes) + len(apple_sizes) + len(favicon_sizes) + 2} icons")

if __name__ == "__main__":
    main()
