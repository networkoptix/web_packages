mkdir ./dist/styles;
mv ./dist/*.css ./dist/styles; sed -i -e 's/src="/href="styles\//g' dist/index.html;
mv ./dist/languages.*.png ./dist/styles
mv ./dist/*.js ./dist/scripts; sed -i -e 's/src="/src="scripts\//g' dist/index.html
