/**
 * Created by workplace on 14/04/2017.
 * @flow
 */

'use strict';

import React from 'react';
import ReactNative from 'react-native';
let {Text, View, StyleSheet} = ReactNative;

import {observer} from 'mobx-react/native'

@observer
export default class Feed extends React.Component {
    render() {
        const {navigator, store} = this.props;

        return (
            <View style={styles.container}>
                <Text style={styles.text}>
                    Sentiment feed placeholder
                </Text>
            </View>
        )
    }
}

Feed.propTypes = {
    navigator: React.PropTypes.shape({
        push: React.PropTypes.func.isRequired,
        pop: React.PropTypes.func.isRequired
    }),
    store: React.PropTypes.shape({
        feed: React.PropTypes.any.isRequired
    })
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
        flexDirection: 'column',
        justifyContent: 'center',
    },
    text: {
        fontSize: 36,
        fontWeight: "500",
        textAlign: 'center',
    },
});