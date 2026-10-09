# Initialize the development environment with common settings
all:
	git config --local submodule.recurse true
	git submodule update --init --recursive
	yarn install
