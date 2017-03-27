/**
 * Created by workplace on 23/03/2017.
 * @flow
 */

'use strict';

import _ from 'lodash'

import ReactNative from 'react-native';
const {ListView} = ReactNative;

import {observable, computed, autorun, action, useStrict} from 'mobx'

import moment from 'moment'

export default class CurrencyDetailsUiStore {
    domainStore: any;

    constructor(domainStore: any) {
        useStrict(true);

        this.domainStore = domainStore;
    }

    @observable periods: string[] = ['1H', '4H', '1D', '1W'];

    @observable selectedPeriod: number = 0;

    @action setSelectedPeriod = (index: number): void => {
        this.selectedPeriod = index;
    };

    @observable isLoading: boolean = false;

    @action setIsLoading = (value: boolean): void => {
        this.isLoading = value;
    };

    @action refresh = (): void => {
        this.domainStore.fetchSentiments();
        this.domainStore.fetchHistory();
    };

    @computed get ticker(): Object {
        return _.find(this.domainStore.tickers, t => _.isEqual(t.symbol, this.domainStore.selectedSymbol));
    }

    @computed get candles(): Object[] {
        console.log(`${this.ticker.symbol}.${this.periods[this.selectedPeriod]}`);
        return _.get(this.domainStore.history, `${this.ticker.symbol}.${this.periods[this.selectedPeriod]}`, []);
    }

    @computed get rows(): Object[] {
        const getData = (obj) => _.get(obj, "[0].data", []);
        const filterBySymbol = (arr) => _.filter(arr, s => { return _.isEqual(s.symbol, this.domainStore.selectedSymbol) });
        const sortByDate = (arr) => _.orderBy(arr, ['date'], ['desc']);
        const formatDates = (arr) => _.map(arr, s => { return {...s, date: moment(s.date).fromNow()}});
        const formatPrice = (arr) => _.map(arr, s => { return {...s, price: `${s.price}`}});

        const rowsForSentiment = _.flow(getData, filterBySymbol, sortByDate, formatDates, formatPrice);

        const rows = rowsForSentiment(this.domainStore.sentiment);
        console.log("Rows:\n",JSON.stringify(rows, null, 2));
        

        return rows
    }

    _dataSource = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    @computed get dataSource(): Object {
        return this._dataSource.cloneWithRows(this.rows.slice());
    }
}