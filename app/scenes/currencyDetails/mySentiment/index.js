/**
 * Created by workplace on 31/01/2017.
 * @flow
 */

'use strict';

import React from 'react';
import ReactNative from 'react-native';
let {Text, View, StyleSheet, ListView} = ReactNative;

import {Icon} from 'react-native-elements'
import NavigationBar from 'react-native-navbar'

import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';

import {observer} from 'mobx-react/native'

import SentimentChart from '../../../components/sentimentChart'

import Cell from './cell'

@observer
export default class MySentiment extends React.Component {

    render() {
        const {navigator, store} = this.props;

        const renderRow = (data, sectionID) => {
            return (
                <Cell
                    date={data.date}
                    price={data.price}
                    sentiment={data.sentiment}
                />
            )
        };


        const changeColor = store.ticker.dailyChangePercent > 0
            ? "#27aa36"
            : store.ticker.dailyChangePercent < 0
                ? "#bd2c27"
                : "#b1b1b2";

        return (


            <View style={styles.container}>
                <View style={styles.currencyRowContainer}>

                    <Text style={[styles.text, styles.priceText]}>
                        {store.ticker.price}
                    </Text>

                    <Text style={[styles.text, styles.changeText, {color: changeColor}]}>
                        {`${store.ticker.dailyChangePercent}%`}
                    </Text>

                    <Text style={[styles.text, styles.periodText]}>
                        {store.periods[store.selectedPeriod]}
                    </Text>
                </View>

                <SentimentChart
                    data={store.chartData}
                    style={styles.chart}
                />

                <View style={styles.listView}>
                    <ListView
                        renderRow={renderRow}
                        dataSource={store.dataSource}
                        enableEmptySections={true}
                        removeClippedSubviews={false}
                    />
                </View>

            </View>
        );
    }
}

MySentiment.propTypes = {
    navigator: React.PropTypes.shape({
        push: React.PropTypes.func.isRequired,
        pop: React.PropTypes.func.isRequired
    }),
    store: React.PropTypes.shape({
        dataSource: React.PropTypes.any.isRequired,
        ticker: React.PropTypes.any.isRequired,
        data: React.PropTypes.arrayOf(
            React.PropTypes.shape({
                date: React.PropTypes.string.isRequired,
                candle: React.PropTypes.shape({
                    open: React.PropTypes.number.isRequired,
                    high: React.PropTypes.number.isRequired,
                    low: React.PropTypes.number.isRequired,
                    close: React.PropTypes.number.isRequired,
                }),
                sentiment: React.PropTypes.string,
            })
        ),
    }),
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff"
    },
    navBar: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#cccccc",
    },
    currencyRowContainer: {
        height: 50,
        flexDirection: 'row',
        paddingTop: 10,
        paddingBottom: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: "#ffffff",
    },
    chartContainer: {
        padding: 20,
        alignItems: 'center',

    },
    toolbarButton: {
        padding: 10,
    },
    text: {
        fontSize: 14,
        fontWeight: "400",
    },
    priceText: {
        flex: 1,
        fontSize: 15,
        textAlign: 'center',
        fontWeight: "500",
    },
    changeText: {
        flex: 1,
        textAlign: 'center',
    },
    periodText: {
        flex: 1,
        color: "#777777",
        textAlign: 'center',
    },
    listView: {
        backgroundColor: 'white',
        padding: 20,
        flex: 1,
    },
    sentimentBadge: {
        margin: 4,
        height: 13,
        width: 13,
        borderRadius: 50,
        backgroundColor: "#28aa38"
    },
    tabsContainerStyle: {
        backgroundColor: 'transparent',
        flexDirection: 'row',
        marginLeft: 20,
        marginRight: 20
    },
    tabStyle: {
        paddingVertical: 5,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: '#999999',
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'white',
    },
    activeTabStyle: {
        backgroundColor: '#999999'
    },
    tabTextStyle: {
        color: '#666666'
    },
    activeTabTextStyle: {
        color: 'white'
    },
    chart: {
        height: responsiveHeight(40),
    },
});