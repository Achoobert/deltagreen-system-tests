#!/bin/bash

# Function to process images and PDFs
convert_images() {
  local dir="$1"
  local count=1

  # Added -iname "*.pdf" to the search criteria
  find "$dir" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.pdf" \) | while read -r file; do
    # Get file extension (lowercase for comparison)
    ext="${file##*.}"
    ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    dir_name=$(basename "$(dirname "$file")")

    # Determine output filename
    if [[ $(basename "$file") =~ ^Screenshot ]]; then
      # Rename Screenshot files with parent dir + count
      new_name="${dir}/${dir_name}_$(printf "%03d" "$count").webp"
      ((count++))
    else
      # Default conversion keeping the original name
      new_name="${file%.*}.webp"
    fi

    # Conversion Logic
    if [[ "$ext_lower" == "pdf" ]]; then
      # Use ImageMagick for PDFs (taking only the first page [0])
      if magick "$file[0]" -quality 80 "$new_name"; then
        echo "Converted PDF: $file → $new_name"
        rm "$file"
      else
        echo "Failed to convert PDF: $file"
      fi
    else
      # Use cwebp for standard images
      if cwebp -q 80 "$file" -o "$new_name"; then
        echo "Converted Image: $file → $new_name"
        rm "$file"
      else
        echo "Failed to convert Image: $file"
      fi
    fi
  done
}

# Run the function
convert_images "$(pwd)"

echo "Conversion complete!"
