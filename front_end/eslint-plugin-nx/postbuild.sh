#!/bin/bash

for file in build/data/*; do
    npx terser $file -o $file
done
