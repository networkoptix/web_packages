mkdir ./dist/styles;
# target only main style
mv ./dist/*.css ./dist/styles; sed -i -e 's/href="styles./href="static\/styles\/styles./g' dist/index.html;
mv ./dist/languages.*.png ./dist/styles
mv ./dist/*.js ./dist/scripts; sed -i -e 's/src="/type="text\/javascript" src="static\/scripts\//g' dist/index.html;
