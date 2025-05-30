# Publishing quicktype

- Checkout latest `master`
- Checkout new branch with name like `hex-fork.3` (check existing branches for what number to use)
- `npm install`
- `npm run pub`
- `cd build/quicktype-core && npm run build && cd ..`
- `./script/make-publish-branch.sh`
- Remove `dist` from `.gitignore`
- Commit and push branch
- Update the main `hex` repo to use the new branch
