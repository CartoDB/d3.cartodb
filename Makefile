BROWSERIFY=./node_modules/browserify/bin/cmd.js


dist/d3.cartodb.full.uncompressed.js: 
	mkdir -p dist
	$(BROWSERIFY) src/index.js --standalone cartodb > dist/d3.cartodb.full.js
	$(BROWSERIFY) src/index.js --no-bundle-external --standalone cartodb > dist/d3.cartodb.js

dist_folder:
	mkdir -p dist

clean: 
	rm -rf dist

testDebug:
	./node_modules/karma/bin/karma start

.PHONY: clean dist_folder