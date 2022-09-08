# Installing quicktype

`quicktype` cannot be installed directly from GitHub using `yarn add git+https://github.com/quicktype/quicktype.git#master --dev`. This is the case because `quicktype` has separate build and publishing steps that generate the actual `quicktype` package.

Therefore, during the forking process for `quicktype` we have changed the installation process to be as follows:

1. Run the build and publish process for quicktype by:
   - Installing `quicktype`'s publishing dependencies using `npm install` inside of the `quicktype` repo
   - Building `quicktype` with `npm run pub`
     - This will create files in the `build/quicktype-*/` and `dist/quicktype-*/` folders.
     - Normally, these files would be ignored by git, however we have added them back to git to be installed from github

// "quicktype-core": "git+https://github.com/hex-inc/quicktype.git#0390e79e558250be4e3e752c2c732976b4ad6a34",
