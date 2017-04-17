/**
 * Created by workplace on 23/03/2017.
 * @flow
 */

'use strict';

import _ from 'lodash'
import Rx from 'rxjs'

import ReactNative from 'react-native';
const {ListView, Alert} = ReactNative;

import mobx, {observable, computed, autorun, action, useStrict} from 'mobx'

export default class CurrenciesUiStore {
    domainStore: any;

    constructor(domainStore: any) {
        useStrict(true);

        this.domainStore = domainStore;
    }

    @observable isLoading: boolean = false;

    @action setIsLoading = (value: boolean): void => {
        this.isLoading = value;
    };

    @action refresh = (): void => {
        console.log("User =", JSON.stringify(this.domainStore.user, null, 2));

        Rx.Observable
            .forkJoin(
                this.domainStore.fetchTickers(),
                this.domainStore.fetchHistory(),
                this.domainStore.fetchSentiment(),
                this.domainStore.fetchAggregates()
            )
            .subscribe(
                ([tickers, history, sentiment, aggregates]) => {
                    this.domainStore.setTickers(tickers);
                    this.domainStore.setHistory(history);
                    this.domainStore.setSentiment(sentiment);
                    this.domainStore.setAggregates(aggregates);

                },
                error => Alert.alert(
                    'Refresh Error',
                    error.toString(),
                    [
                        {text: 'OK', onPress: () => {}},
                    ]
                )
            );

    };

    @action selectSymbol = (symbol: string): void => {
        this.domainStore.setSelectedSymbol(symbol);
    };

    @action addSentiment = (sentiment: Object): void => {
        this.domainStore.addSentiment(sentiment)
            .flatMap(() => this.domainStore.fetchSentiment())
            .subscribe(
                s => this.domainStore.setSentiment(s),
                error => Alert.alert(
                    'Sentiment Update Error',
                    error.toString(),
                    [
                        {text: 'OK', onPress: () => {}},
                    ]
                )
            )
    };

    @computed get rows(): Object[] {
        const selectedTickers = _.filter(this.domainStore.tickers, t => _.includes(this.domainStore.symbols, t.symbol));

        return selectedTickers.map(t => {
            return {
                symbol: t.symbol,
                displaySymbol: _.replace(t.symbol, "_", "/"),
                dailyChangePercent: t.dailyChangePercent.toFixed(2),
                price: t.price.toPrecision(4),
                volume: t.volume,
            }
        });
    }

    _dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    @computed get dataSource(): Object {
        return this._dataSource.cloneWithRows(this.rows.slice());
    }

}