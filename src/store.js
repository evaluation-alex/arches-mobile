import Vue from 'vue';
import Vuex from 'vuex';
import PouchDB from 'pouchdb';
import PouchDBupsert from 'pouchdb-upsert';
import PouchDBFind from 'pouchdb-find';
import SqlLiteAdapter from 'pouchdb-adapter-cordova-sqlite';

Vue.use(Vuex);
PouchDB.plugin(PouchDBupsert);
PouchDB.plugin(PouchDBFind);
PouchDB.plugin(SqlLiteAdapter);

var adapter = 'cordova-sqlite';

// this is mostly just for testing but this shouldn't hurt anything by being in here
// as of this writing the cordova-plugin-sqlite-2 doesn't support the browser platform
if (!window.cordova || window.cordova.platformId === 'browser') {
    adapter = 'idb';
}

/*
'servers' object def:

{
    active: server_url,
    servers: {
        server_url: {
            url: server_url,
            nickname: nickname,
            username: username, <-- maybe we don't store
            password: password, <-- maybe we don't store
            token:  token,
            projects: {
                project_id: {
                    id,
                    name,
                    etc..
                }
            },
            active_project: project_id,
            project_sort: [project_id1, project_id2...]
        }
    }
}

*/

var pouchDBs = (function() {
    return {
        _projectDBs: {},
        servers: 'undefined',
        // _serverConfigs: {},
        setupServer: function(config) {
            var self = this;
            this.servers = new PouchDB('app_servers', {
                adapter: adapter,
                iosDatabaseLocation: 'Library',
                auto_compaction: true
            });

            this.servers.get('servers')
                .then(function(doc) {
                    Object.keys(doc.servers).forEach(function(serverUrl) {
                        var server = doc.servers[serverUrl];
                        Object.keys(server.projects).forEach(function(projectId) {
                            self.setupProject(server, projectId);
                        });
                    });
                })
                .catch(function() {
                // no need to do anything
                    console.log('error');
                });
        },
        setupProject: function(server, projectId) {
            if (!this._projectDBs[projectId]) {
                this._projectDBs[projectId] = {};
            }
            this._projectDBs[projectId]['local'] = new PouchDB('project_' + projectId, {
                adapter: adapter,
                iosDatabaseLocation: 'Library'
            });
            this._projectDBs[projectId]['remote'] = new PouchDB(server.url + '/couchdb/project_' + projectId, {
                ajax: {
                    headers: {
                        authorization: 'Bearer ' + server.token
                        // 'X-Some-Special-Header': 'foo'
                    },
                    withCredentials: false
                }
            });
        },
        syncProject: function(projectId) {
            // setupDBs(projectId);

            return this._projectDBs[projectId]['local']
                .sync(this._projectDBs[projectId]['remote'], {
                    // live: true,
                    // retry: true
                })
                .on('complete', function() {
                // yay, we're in sync!
                    console.log('yay, we\'re in sync!');
                // viewModel.remote_data_updated(false);
                // listDocs(projectId);
                // $.get( "push_edits_to_db?projectId=" + projectId, function(data) {
                //     console.log( "Load was performed." );
                // });
                })
                // .on('change', function(info) {
                //     // handle change
                // })
                // .on('paused', function(err) {
                //     // replication paused (e.g. replication up to date, user went offline)
                // })
                // .on('active', function() {
                //     // replicate resumed (e.g. new changes replicating, user went back online)
                // })
                // .on('denied', function(err) {
                //     // a document failed to replicate (e.g. due to permissions)
                // })
                .on('error', function(err) {
                // boo, we hit an error!
                    console.log('boo, we hit an error!');
                    console.log(err);
                });

            // sync.cancel(); // whenever you want to cancel only if live = true
        },
        getChanges: function(projectId) {
            return this._projectDBs[projectId]['local'].changes({
                // limit: 10,
                // since: 0
            }).then(function(result) {
                // handle result
                console.log(result);
                return result;
            }).catch(function(err) {
                console.log(err);
            });
        },
        getTiles: function(projectId, resourceId) {
            return this._projectDBs[projectId]['local']
                .allDocs({include_docs: true, descending: true})
                .then(function(doc) {
                    var docs = doc.rows.map(function(x) {
                        return x.doc;
                    });
                    return docs;
                })
                .catch(function(err) {
                    console.log(err);
                });
        },
        putTile: function(projectId, tile) {
            this._projectDBs[projectId]['local']
                .changes({
                    include_docs: true
                })
                .then(function(docs) {
                    console.log(docs);
                });
            return this._projectDBs[projectId]['local']
                .put(tile)
                .then(function(response) {
                    tile._rev = response.rev;
                    return response;
                })
                .catch(function(err) {
                // CATCH 409 ERROR HERE
                    console.log(err);
                });
        },
        putResource: function(projectId, resource) {
            this._projectDBs[projectId]['local']
                .changes({
                    include_docs: true
                })
                .then(function(docs) {
                    console.log(docs);
                });
            return this._projectDBs[projectId]['local']
                .put(resource)
                .then(function(response) {
                    resource._rev = response.rev;
                    return response;
                })
                .catch(function(err) {
                // CATCH 409 ERROR HERE
                    console.log(err);
                });
        },
        getResources: function(projectId, instances) {
            var query;
            if (!instances) {
                query = {
                    type: 'resource'
                };
            } else {
                query = {
                    type: 'resource',
                    resourceinstanceid: {
                        $in: instances
                    }
                };
            };
            return this._projectDBs[projectId]['local'].find({
                selector: query
            }).then(function(docs) {
                return docs;
            }).catch(function(err) {
                console.log(err);
            });
        },
        getResourcesGeoJSON: function(projectId) {
            return this._projectDBs[projectId]['local'].find({
                selector: {
                    type: 'resource'
                }
            }).then(function(docs) {
                let features = [];
                for (const doc of docs.docs) {
                    for (const geom of doc.geometries) {
                        for (let feature of geom.geom.features) {
                            feature.properties.id = doc._id;
                            feature.properties.displayname = doc.displayname;
                            feature.properties.displaydescription = doc.displaydescription;
                            features.push(feature);
                        }
                    }
                }
                return {
                    type: 'FeatureCollection',
                    features: features
                };
            }).catch(function(err) {
                console.log(err);
            });
        }
    };
}());

var store = new Vuex.Store({
    // strict: true,
    state: {
        dbs: {
            app_servers: {
                _id: 'servers',
                active: null,
                servers: {}
            }
        },
        tiles: []
    },
    getters: {
        activeServer: function(state, getters) {
            var appServers = state.dbs.app_servers;
            return getters.server(appServers.active);
        },
        server: function(state, getters) {
            return function(url) {
                var appServers = state.dbs.app_servers;
                return appServers.servers[url] || undefined;
            };
        },
        servers: function(state, getters) {
            return state.dbs.app_servers.servers;
        },
        currentProjects: function(state, getters) {
            if (!getters.activeServer) {
                return {};
            }
            return getters.activeServer.projects;
        },
        activeProject: function(state, getters) {
            if (!getters.activeServer) {
                return {};
            }
            var projectId = getters.activeServer.active_project;
            return getters.activeServer.projects[projectId];
        },
        getTiles: function(state, getters) {
            return state.tiles;
        },
        resourcesToSync: function(state, getters) {
            var project = getters.activeProject;
            if ('resources_to_sync' in project) {
                return Object.keys(project.resources_to_sync).length;
            }
            return 0;
        },
        currentGraphs: function(state, getters) {
            if (!getters.activeServer) {
                return {};
            }
            var graphs = {};
            getters.activeProject.graphs.forEach(function(graph) {
                graphs[graph.graphid] = graph;
            });
            return graphs;
        }
    },
    mutations: {
        updateAppServers: function(state, value) {
            state.dbs.app_servers = value;
        },
        addNewServer: function(state, newServer) {
            if (typeof store.getters.server(newServer.url) === 'undefined') {
                Vue.set(state.dbs.app_servers.servers, newServer.url, newServer);
            }
            store.commit('setActiveServer', newServer.url);
            store.dispatch('saveServerInfo');
        },
        setActiveServer: function(state, value) {
            state.dbs.app_servers.active = value;
        },
        updateProjects: function(state, serverDoc) {
            var server = store.getters.server(serverDoc.url);
            serverDoc.projects.forEach(function(project) {
                Vue.set(server.projects, project.id, project);
            });
            store.dispatch('saveServerInfo');
        },
        setActiveProject: function(state, value) {
            store.getters.activeServer.active_project = value.project_id;
            store.dispatch('getTiles', value.project_id)
                .then(function(doc) {
                    return doc;
                });
        },
        setActiveResourceInstance: function(state, value) {
            store.getters.activeServer.active_resource = value.resourceinstanceid;
        },
        setLastProjectSync: function(state, projectId) {
            var now = new Date();
            function pad(n, width, z) {
                z = z || '0';
                n = n + '';
                return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
            }
            Vue.set(store.getters.currentProjects[projectId].lastsync, 'date', now.toISOString().split('T')[0].replace(/-/g, '/'));
            Vue.set(store.getters.currentProjects[projectId].lastsync, 'time', pad(now.getHours(), 2) + ':' + pad(now.getMinutes(), 2));
            store.dispatch('saveServerInfo');
        },
        setResourceAsEdited: function(state, value) {
            Vue.set(store.getters.currentProjects[value.projectId].resources_to_sync, value.resourceInstanceId, false);
        }
    },
    modules: {
        cordova: {
            namespaced: false,
            state: {
                deviceready: false
            },
            mutations: {
                deviceready(state, ready) {
                    state.deviceready = ready;
                }
            }
        }
    },
    actions: {
        saveServerInfo: function({commit, state}) {
            var appServers = state.dbs.app_servers;
            return pouchDBs.servers.upsert('servers', function(serverDoc) {
                serverDoc = appServers;
                return serverDoc;
            });
        },
        syncRemote: function({commit, state}, projectId) {
            return pouchDBs.syncProject(projectId)
                .then(function() {
                    return store.dispatch('getTiles', projectId);
                })
                .then(function() {
                    return store.commit('setLastProjectSync', projectId);
                });
            // don't catch here, let the calling function catch and handle any error
        },
        initServerStore: function({ commit, state }) {
            pouchDBs.setupServer();
            return pouchDBs.servers.get('servers')
                .then(function(doc) {
                    // go to the last active server and project
                    commit('updateAppServers', doc);
                    return doc;
                })
                .catch(function() {
                    var doc = state.dbs.app_servers;

                    return pouchDBs.servers.put(doc)
                        .finally(function(response) {
                            return state.dbs.app_servers;
                        });
                });
        },
        getRemoteProjects: function({commit, state}, server) {
            return fetch(server.url + '/surveys', {
                method: 'GET',
                headers: new Headers({
                    'Authorization': 'Bearer ' + server.token
                })
            })
                .then(function(response) {
                    // return the response object or throw an error;
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Network response was not ok.');
                })
                .then(function(json) {
                    // return the response object or throw an error
                    json.forEach(function(project) {
                        pouchDBs.setupProject(server, project.id);
                        // pouchDBs.syncProject(project.id);
                        project.lastsync = {
                            date: '',
                            time: ''
                        };
                        project.resources_to_sync = {};
                        project.resources_with_conflicts = {};
                    });
                    commit('updateProjects', {
                        url: server.url,
                        projects: json
                    });
                    return json;
                })
                .catch(function(error) {
                    console.log('Error:', error);
                    self.error = true;
                });
        },
        getProjectChanges: function({commit, state}, projectId) {
            return pouchDBs.getChanges(projectId);
        },
        getTiles: function({commit, state}, projectId) {
            pouchDBs.getTiles(projectId).then(function(tiles) {
                state.tiles = tiles;
            });
        },
        persistTile: function({commit, state}, tile) {
            var project = store.getters.activeProject;
            return pouchDBs.putTile(project.id, tile)
                .then(function(doc) {
                    commit('setResourceAsEdited', {'projectId': project.id, 'resourceInstanceId': tile.resourceinstance_id});
                    return doc;
                });
        },
        persistResource: function({commit, state}, resource) {
            var project = store.getters.activeProject;
            return pouchDBs.putResource(project.id, resource)
                .then(function(doc) {
                    return doc;
                });
        },
        getProjectResourcesGeoJSON: function({commit, state}, projectId) {
            return pouchDBs.getResourcesGeoJSON(projectId);
        },
        getProjectResources: function({commit, state}, projectId) {
            return pouchDBs.getResources(projectId);
        },
        getResource: function({commit, state}, ids) {
            var resources = pouchDBs.getResources(ids.projectid, [ids.resourceid]);
            return resources;
        },
        setupProjectBasemaps: function({commit, state}, project) {
            const mbtilesFile = `${project.id}.mbtiles`;
            return new Promise((resolve, reject) => {
                if (window.device.platform === 'Android') {
                    return window.resolveLocalFileSystemURL(
                        window.cordova.file.applicationStorageDirectory,
                        (dir) => {
                            dir.getDirectory(
                                'databases',
                                {create: true},
                                (subdir) => {
                                    resolve(subdir);
                                }
                            );
                        },
                        reject
                    );
                } else if (window.device.platform === 'iOS') {
                    return window.resolveLocalFileSystemURL(
                        window.cordova.file.documentsDirectory,
                        resolve,
                        reject
                    );
                } else {
                    reject(new Error('Platform not supported'));
                };
            }).then((target) => {
                return new Promise((resolve, reject) => {
                    target.getFile(mbtilesFile, {}, resolve, reject);
                }).catch(() => {
                    return new Promise((resolve, reject) => {
                        new window.FileTransfer().download(
                            encodeURI(project.tilecache),
                            target.toURL() + mbtilesFile,
                            resolve,
                            reject,
                            true
                        );
                    });
                });
            });
        }
    }
});

export default store;
