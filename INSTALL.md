# Installing quicktype

`quicktype` cannot be installed directly from GitHub using `yarn add git+https://github.com/quicktype/quicktype.git#master --dev`. This is the case because `quicktype` has separate build and publishing steps that generate the actual `quicktype` package.

Therefore, during the forking process for `quicktype` we have changed the installation process to be as follows:

1. Run the build and publish process for quicktype by:
   - Either on master or on a fork of master install `quicktype`'s publishing dependencies using `npm install` inside of the `quicktype` repo
   - Building `quicktype` with `npm run pub`
     - This will create files in the `build/quicktype-*/` and `dist/quicktype-*/` folders.
     - Normally, these files would be ignored by git
2. Copy the relevant packages in `build/*` to a non `quicktype` repo location
   - Make sure this package is being proper tracked in `.gitignore`
   - Currently, we only track `quicktype-core` as that is all we are using
3. Commit these changes / new package files and open a PR/merge with master
4. Once merged to master, the built packages copied from `build/*` need to be used to update the `github-install` branch.
   - Once these new `built` files are merged (usually as a hard overwrite) commit the changes to `github-install`
5. The `quicktype-core` package can now be installed using the following line in `packages.json`
   - "quicktype-core": "git+https://github.com/hex-inc/quicktype.git#<COMMIT_FOR_GITHUB_IBNSTALL_BRANCH>",
