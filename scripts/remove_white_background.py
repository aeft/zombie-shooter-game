#!/usr/bin/env python3
"""
Generic script to remove white background from images and make them transparent.
Can process single images or entire directories.
"""

from PIL import Image
import os
import sys
import glob

def remove_background(input_path, output_path=None, tolerance=30):
    """
    Remove background from an image and make it transparent.
    Automatically detects the most common background color.
    
    Args:
        input_path (str): Path to the input image
        output_path (str): Path to save the processed image (optional)
        tolerance (int): Tolerance for background color detection (0-255)
    """
    if not os.path.exists(input_path):
        print(f"Error: Input file '{input_path}' not found.")
        return False
    
    try:
        # Open the image
        img = Image.open(input_path)
        print(f"Original image size: {img.size}")
        print(f"Original image mode: {img.mode}")
        
        # Convert to RGBA if not already (to support transparency)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Get image data
        data = img.getdata()
        
        # Auto-detect background color from corners
        corners = [
            data[0],  # Top-left
            data[img.size[0] - 1],  # Top-right
            data[img.size[0] * (img.size[1] - 1)],  # Bottom-left
            data[img.size[0] * img.size[1] - 1]  # Bottom-right
        ]
        
        # Find the most common corner color as background
        from collections import Counter
        corner_colors = [tuple(corner[:3]) for corner in corners]
        bg_color = Counter(corner_colors).most_common(1)[0][0]
        
        print(f"Detected background color: RGB{bg_color}")
        
        # Create new image data with transparent background
        new_data = []
        pixels_changed = 0
        
        for item in data:
            # Check if pixel is close to background color (with tolerance)
            r, g, b = item[:3]  # Get RGB values
            
            # Calculate color distance from background
            color_distance = abs(r - bg_color[0]) + abs(g - bg_color[1]) + abs(b - bg_color[2])
            
            # If pixel is close to background color, make it transparent
            if color_distance <= tolerance:
                # Make pixel transparent (RGBA: Red, Green, Blue, Alpha)
                new_data.append((r, g, b, 0))  # Alpha = 0 means transparent
                pixels_changed += 1
            else:
                # Keep original pixel with full opacity
                if len(item) == 4:
                    new_data.append(item)  # Already has alpha channel
                else:
                    new_data.append((r, g, b, 255))  # Add full opacity
        
        # Apply the new data to the image
        img.putdata(new_data)
        
        # Set output path if not provided
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_transparent{ext}"
        
        # Save the processed image
        img.save(output_path, "PNG")
        
        print(f"Successfully processed image!")
        print(f"Pixels changed to transparent: {pixels_changed}")
        print(f"Output saved to: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

def process_directory(directory_path, tolerance=30, backup=True):
    """
    Process all images in a directory to remove white backgrounds.
    
    Args:
        directory_path (str): Path to directory containing images
        tolerance (int): Tolerance for white color detection (0-255)
        backup (bool): Whether to create backup copies before processing
    """
    if not os.path.exists(directory_path):
        print(f"Error: Directory '{directory_path}' not found.")
        return False
    
    # Supported image formats
    image_extensions = ['*.png', '*.jpg', '*.jpeg', '*.bmp', '*.tiff']
    
    # Find all image files
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(directory_path, ext)))
        image_files.extend(glob.glob(os.path.join(directory_path, ext.upper())))
    
    if not image_files:
        print(f"No image files found in '{directory_path}'")
        return False
    
    print(f"\nFound {len(image_files)} image(s) to process:")
    for img_file in image_files:
        print(f"  - {os.path.basename(img_file)}")
    
    success_count = 0
    
    for img_file in image_files:
        print(f"\n--- Processing: {os.path.basename(img_file)} ---")
        
        # Create backup if requested
        if backup:
            backup_path = f"{img_file}.backup"
            if not os.path.exists(backup_path):
                try:
                    import shutil
                    shutil.copy2(img_file, backup_path)
                    print(f"Backup created: {os.path.basename(backup_path)}")
                except Exception as e:
                    print(f"Warning: Could not create backup: {e}")
        
        # Process the image (overwrite original)
        if remove_white_background(img_file, img_file, tolerance):
            success_count += 1
        else:
            print(f"Failed to process: {os.path.basename(img_file)}")
    
    print(f"\n🎉 Processing complete!")
    print(f"Successfully processed: {success_count}/{len(image_files)} images")
    
    if backup:
        print("\nBackup files created with '.backup' extension")
        print("You can delete them if you're satisfied with the results")
    
    return success_count > 0

def main():
    """Main function with command line argument support."""
    
    # Default settings
    tolerance = 30
    
    if len(sys.argv) < 2:
        print("Usage: python remove_white_background.py <filename> [tolerance]")
        print("Example: python remove_white_background.py zombie.png 30")
        return
    
    filename = sys.argv[1]
    
    # Allow tolerance to be specified as second argument
    if len(sys.argv) > 2:
        try:
            tolerance = int(sys.argv[2])
        except ValueError:
            print("Warning: Invalid tolerance value, using default 30")
    
    # Check if it's just a filename (add assets path)
    if not os.path.sep in filename:
        filepath = os.path.join("assets", filename)
    else:
        filepath = filename
    
    if not os.path.exists(filepath):
        print(f"Error: File '{filepath}' not found.")
        return
    
    print(f"Processing: {filepath}")
    print(f"Tolerance: {tolerance}")
    print("No backup will be created - overwriting original file")
    
    success = remove_background(filepath, filepath, tolerance=tolerance)
    if success:
        print("\n✓ Image processing completed successfully!")
    else:
        print("\n✗ Image processing failed.")

if __name__ == "__main__":
    main()