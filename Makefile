BROWSERIFY=./node_modules/browserify/bin/cmd.js

dist/d3.cartodb.full.uncompressed.js: 
	mkdir -p dist
	$(BROWSERIFY) src/index.js --standalone cartodb > dist/d3.cartodb.js

dist_folder:
	mkdir -p dist

clean: 
	rm -rf dist

.PHONY: clean dist_folder