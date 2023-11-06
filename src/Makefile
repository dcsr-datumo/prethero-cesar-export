r_folder="../result"
f_folder="../formatted"
results = $(wildcard ../result/*.json)
formatted = $(patsubst ../result/%, ../formatted/%, $(results))

.PHONY: export
export: ## 1. query the DaSCH infrastructure, parse and format the data
	mkdir -p $(r_folder) $(f_folder)
	node export_promise.js

.PHONY: format
format: $(formatted) ## 2. make exported json more readable

.PHONY: tar
tar: ## 3. pack and compact the formatted output
	tar czf $(f_folder)/export.tgz $(f_folder)/*.json

.PHONY: clean-formatted
clean-formatted: ## 4. remove formatted output
	rm $(f_folder)/*

.PHONY: clean-unformatted
clean-unformatted: ## 5. remove un-formatted output
	rm $(r_folder)/*

.PHONY: clean-all
clean-all: clean-formatted clean-unformatted ## 6. remove all generated output

../formatted/%.json: ../result/%.json
	cat $< | jq '.' > $@

.PHONY: help
help: ## 0. this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST) | sort -h -k 3 

.DEFAULT_GOAL := help
