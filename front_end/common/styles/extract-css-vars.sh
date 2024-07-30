#!/bin/bash

files_to_extract_css_vars=(
    _theme_variables_common.scss
    _theme_variables_dark.scss
    _theme_variables_light.scss
)

# Temporary file to store all found CSS variables
temp_file=$(mktemp)

# Extract CSS variables from each file
for file in "${files_to_extract_css_vars[@]}"; do
    grep -o 'var(--[a-zA-Z0-9_-]*' "$file" | awk -F'(' '{print $2}' >> "$temp_file"
done

# Remove duplicates and sort the variables
sort -u "$temp_file" > sorted_vars.txt

# Convert the sorted variables to a JSON array manually
json_array="["
while IFS= read -r var; do
    json_array+="\"$var\","
done < sorted_vars.txt
# Remove the trailing comma and close the JSON array
json_array="${json_array%,}]"

# Output the JSON array to theme-css-vars.json
echo "$json_array" > theme-css-vars.json

# Clean up temporary files
rm "$temp_file" sorted_vars.txt

echo "CSS variables have been extracted to theme-css-vars.json"