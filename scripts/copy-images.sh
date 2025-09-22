#!/bin/bash

# Copy all images from content/posts to public/images
for dir in content/posts/*/; do
  if [ -d "$dir" ]; then
    post_name=$(basename "$dir")
    # Create directory in public
    mkdir -p "public/images/$post_name"
    # Copy images if they exist
    for ext in jpg png gif webp svg; do
      for img in "$dir"*.$ext; do
        if [ -f "$img" ]; then
          cp "$img" "public/images/$post_name/"
          echo "Copied: $img to public/images/$post_name/"
        fi
      done
    done
  fi
done
echo "All images copied successfully"