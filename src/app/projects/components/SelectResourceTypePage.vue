<template>
        <div class="body">
            <v-ons-list>
                <v-ons-list-item tappable modifier="longdivider" v-for="resource_type in resource_types" :key="resource_type.graphid" @click="selectResourceType(resource_type);">
                    <span>
                        <div class='resource-model-name'>
                            <span class="icon-circle" v-bind:style="{ border: ['solid', '1px', resource_type.color], background: [resource_type.color], color: '#fff'}">
                                <v-ons-icon v-bind:icon="resource_type.iconclass.replace('fa ', '')" v-bind:style="{height:'18px', width:'18px'}"></v-ons-icon>
                            </span>
                        <span class='resource-model-title'>
                            <span style="padding-left: 0"> New {{resource_type.name}}</span>
                            <span class='resource-model-subtitle'>Currently x records; x edited</span>
                        </span>
                        </div>
                    </span>
                </v-ons-list-item>
            </v-ons-list>
        </div>
</template>

<script>
export default {
    name: 'SelectResourceTypePage',
    data() {
        return {
            state: 'initial'
        };
    },
    computed: {
        resource_types: {
            cache: false,
            get: function() {
                var self = this;
                return self.$store.getters.activeProject.graphs;
            }
        }
    },
    methods: {
        selectResourceType: function(e) {
            console.log("You've selected:", e);
        }
    }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .resource-model-name {
        padding-top: 10px;
        display: flex;
        flex-direction: row;
    }
    .resource-model-title {
        display: flex;
        flex-direction: column;
        padding-left: 5px;
    }
    .resource-model-subtitle {
        font-size: 12px;
        padding-top: 2px;
    }
    .icon-circle {
        border: solid 1px #aec3f4;
        padding: 10px;
        border-radius: 50%;
        height: 18px;
        width: 18px;
        background: #d7e0f8;
    }
</style>
