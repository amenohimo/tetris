#!/usr/bin/env python3
"""
T-Piece icon generator for Tetris application.
Creates a 3D beveled T-piece icon with multiple resolutions for favicon.
"""

from PIL import Image, ImageDraw
import struct

def create_t_piece_icon(size):
    """Create a T-piece icon with 3D bevel effect."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cell_size = size // 4
    offset = cell_size // 2
    
    cells = [(0, 1), (1, 0), (1, 1), (1, 2)]
    
    main_color = (160, 0, 240)
    highlight_color = (210, 100, 255)
    shadow_color = (100, 0, 180)
    
    for row, col in cells:
        x = col * cell_size + offset
        y = row * cell_size + offset
        
        draw.rectangle([x, y, x + cell_size, y + cell_size], 
                      fill=main_color, outline=main_color)
        
        draw.line([x, y, x + cell_size, y], fill=highlight_color, width=1)
        draw.line([x, y, x, y + cell_size], fill=highlight_color, width=1)
        
        draw.line([x, y + cell_size, x + cell_size, y + cell_size], 
                 fill=shadow_color, width=1)
        draw.line([x + cell_size, y, x + cell_size, y + cell_size], 
                 fill=shadow_color, width=1)
    
    return img

def save_ico(images, output_path):
    """Save multiple images as a multi-frame ICO file."""
    ico_data = b""
    
    ico_data += b"\x00\x00"
    ico_data += b"\x01\x00"
    ico_data += struct.pack("<H", len(images))
    
    for img in images:
        width = img.width
        height = img.height
        
        w = 0 if width == 256 else width
        h = 0 if height == 256 else height
            
        ico_data += struct.pack("<BBBBHHII", 
                                w, h, 0, 0, 0, 0, 0, 0, 0, 0)
        
        dib_size = 40
        dib_data = struct.pack("<IHHHHHIII", 
                               dib_size, img.width, img.height,
                               1, 32, 0, img.width * img.height * 4,
                               0, 0, 0)
        
        pixel_data = b""
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = img.getpixel((x, y))
                pixel_data += struct.pack("<BBBB", b, g, r, a)
        
        while len(pixel_data) % 4 != 0:
            pixel_data += b"\x00"
        
        ico_data += dib_data + pixel_data
    
    with open(output_path, 'wb') as f:
        f.write(ico_data)

def main():
    sizes = [16, 24, 32, 48, 64, 128, 256]
    
    images = [create_t_piece_icon(size) for size in sizes]
    
    output_dir = "O:\\_Programs\\_tools\\tetris\\main\\public"
    
    save_ico(images, f"{output_dir}\\favicon.ico")
    
    images[-1].save(f"{output_dir}\\icon-256.png")
    
    print(f"Created favicon.ico with {len(sizes)} resolutions")
    print(f"Created icon-256.png (256x256)")

if __name__ == "__main__":
    main()