#!/bin/bash

# Define the input file
input_file=$1

# Use sed to perform the search and replace
sed -i.bak -E 's/#\{\$([a-zA-Z_][a-zA-Z0-9_-]*)\}/var(--\1, #\{\$\1\})/g' "$input_file"

echo "Replacement complete. Backup of the original file is saved as ${input_file}.bak"