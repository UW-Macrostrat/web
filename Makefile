# Initialize the development environment with common settings
all:
	git config --local submodule.recurse true
	git submodule update --init --recursive
	yarn install
VERSION := $(shell node -p "require('./package.json').version")

release:
	# Ensure that the repository is clean
	git diff-index --quiet HEAD --
	git tag -a v$(VERSION) -m "Version $(VERSION)"
	git push origin tag v$(VERSION)
