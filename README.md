# arches_mobile

> A mobile app to manage Arches resources

# To get started:

```
yarn install

```

# To run in the browser:
```
# with hot reload but without cordova enabled
yarn run dev

or

# without hot reload but with cordova enabled
cordova run browser

```

# To run in a simulator:
```
cordova run ios|browser

# to run in android, I had to run from directly from android studio

```


## Build/Run Options

``` bash
# install dependencies
yarn install

# add platforms for various simulators
cordova platform add ios --save
cordova platform add android --save
cordova platform add browser --save

# run app in device simulator
cordova run ios|browser

# to run in android, I had to run from directly from android studio

# serve with hot reload at localhost:8080
yarn run dev

# build for production with minification
yarn run build

# build for production and view the bundle analyzer report
yarn run build --report

# run unit tests - not available yet
yarn run unit

# run e2e tests - not available yet
yarn run e2e

# run all tests - not available yet
yarn test
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
