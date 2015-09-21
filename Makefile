
dist/d3.cartodb.js: node_modules/.install dist $(shell $(BROWSERIFY) --list src/index.js)
	$(BROWSERIFY) src/index.js --debug > $@
