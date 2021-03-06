import I18n from 'i18n-js';
import { Container, Icon, Spinner, Text, Thumbnail, View } from 'native-base';
import React from 'react';
import { Alert, Image, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { DrawerActions } from 'react-navigation-drawer';

import noPhotoActive from '../../../../assets/no-photo.png';
import noPhoto from '../../../../assets/no-photo.png';
import noSite from '../../../../assets/no-site.png';
import I18nManager from '../../../I18n/I18nManager';
import ConnectorStatusComponent from '../../../components/connector-status/ConnectorStatusComponent';
import HeaderComponent from '../../../components/header/HeaderComponent';
import BaseProps from '../../../types/BaseProps';
import ChargingStation, { ChargePointStatus, Connector } from '../../../types/ChargingStation';
import { HTTPAuthError } from '../../../types/HTTPError';
import Transaction from '../../../types/Transaction';
import User from '../../../types/User';
import Constants from '../../../utils/Constants';
import Message from '../../../utils/Message';
import Utils from '../../../utils/Utils';
import BaseAutoRefreshScreen from '../../base-screen/BaseAutoRefreshScreen';
import computeStyleSheet from './ChargingStationConnectorDetailsStyles';

const START_TRANSACTION_NB_TRIAL = 4;

export interface Props extends BaseProps {
}

interface State {
  loading?: boolean;
  chargingStation?: ChargingStation;
  connector?: Connector;
  transaction?: Transaction;
  isAdmin?: boolean;
  isSiteAdmin?: boolean;
  canStartTransaction?: boolean;
  canStopTransaction?: boolean;
  canDisplayTransaction?: boolean;
  userImage?: string;
  siteImage?: string;
  elapsedTimeFormatted?: string;
  totalInactivitySecs?: number;
  inactivityFormatted?: string;
  startTransactionNbTrial?: number;
  isPricingActive?: boolean;
  buttonDisabled?: boolean;
  refreshing?: boolean;
}

export default class ChargingStationConnectorDetails extends BaseAutoRefreshScreen<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: true,
      chargingStation: null,
      connector: null,
      transaction: null,
      isAdmin: false,
      isSiteAdmin: false,
      canStartTransaction: false,
      canStopTransaction: false,
      canDisplayTransaction: false,
      userImage: null,
      siteImage: null,
      elapsedTimeFormatted: '-',
      totalInactivitySecs: 0,
      inactivityFormatted: '-',
      startTransactionNbTrial: 0,
      isPricingActive: false,
      buttonDisabled: true,
      refreshing: false
    };
  }

  public setState = (state: State | ((prevState: Readonly<State>, props: Readonly<Props>) => State | Pick<State, never>) | Pick<State, never>, callback?: () => void) => {
    super.setState(state, callback);
  }

  public getSiteImage = async (siteID: string): Promise<string> => {
    try {
      // Get Site
      const site = await this.centralServerProvider.getSiteImage(siteID);
      return site;
    } catch (error) {
      // Other common Error
      Utils.handleHttpUnexpectedError(this.centralServerProvider, error,
        'sites.siteUnexpectedError', this.props.navigation, this.refresh);
    }
    return null;
  };

  public getChargingStation = async (chargingStationID: string): Promise<ChargingStation> => {
    try {
      // Get Charger
      const chargingStation = await this.centralServerProvider.getChargingStation({ ID: chargingStationID });
      return chargingStation;
    } catch (error) {
      // Other common Error
      Utils.handleHttpUnexpectedError(this.centralServerProvider, error,
        'chargers.chargerUnexpectedError', this.props.navigation, this.refresh);
    }
    return null;
  };

  public getTransaction = async (transactionID: number): Promise<Transaction> => {
    try {
      // Get Transaction
      const transaction = await this.centralServerProvider.getTransaction({ ID: transactionID });
      return transaction;
    } catch (error) {
      // Check if HTTP?
      if (!error.request || error.request.status !== HTTPAuthError.ERROR) {
        Utils.handleHttpUnexpectedError(this.centralServerProvider, error,
          'transactions.transactionUnexpectedError', this.props.navigation, this.refresh);
      }
    }
    return null;
  };

  public getLastTransaction = async (chargeBoxID: string, connectorId: number): Promise<Transaction> => {
    try {
      // Get Transaction
      const transaction = await this.centralServerProvider.getLastTransaction(chargeBoxID, connectorId);
      return transaction;
    } catch (error) {
      // Check if HTTP?
      if (!error.request || error.request.status !== HTTPAuthError.ERROR) {
        Utils.handleHttpUnexpectedError(this.centralServerProvider, error,
          'transactions.transactionUnexpectedError', this.props.navigation, this.refresh);
      }
    }
    return null;
  };

  public getUserImage = async (user: User): Promise<string> => {
    try {
      // User provided?
      if (user) {
        return await this.centralServerProvider.getUserImage({ ID: user.id });
      }
    } catch (error) {
      // Other common Error
      Utils.handleHttpUnexpectedError(this.centralServerProvider, error,
        'users.userUnexpectedError', this.props.navigation, this.refresh);
    }
    return null;
  };

  public showLastTransaction = async () => {
    const { navigation } = this.props;
    const chargingStationID = Utils.getParamFromNavigation(this.props.navigation, 'chargingStationID', null);
    const connectorID: number = parseInt(Utils.getParamFromNavigation(this.props.navigation, 'connectorID', null), 10);
    // Get the last session
    const transaction = await this.getLastTransaction(chargingStationID, connectorID);
    if (transaction) {
      // Navigate
      navigation.navigate({
        routeName: 'TransactionDetailsTabs',
        params: { transactionID: transaction.id },
        key: `${Utils.randomNumber()}`
      });
    } else {
      Alert.alert(I18n.t('chargers.noSession'), I18n.t('chargers.noSessionMessage'));
    }
  }

  // tslint:disable-next-line: cyclomatic-complexity
  public refresh = async () => {
    let siteImage = null;
    let userImage = null;
    let transaction = null;
    const chargingStationID = Utils.getParamFromNavigation(this.props.navigation, 'chargingStationID', null);
    const connectorID: number = parseInt(Utils.getParamFromNavigation(this.props.navigation, 'connectorID', null), 10);
    // Get Charger
    const chargingStation = await this.getChargingStation(chargingStationID);
    const connector = chargingStation ? Utils.getConnectorFromID(chargingStation, connectorID) : null;
    // Get the Site Image
    if (chargingStation && chargingStation.siteArea && !this.state.siteImage) {
      siteImage = await this.getSiteImage(chargingStation.siteArea.siteID);
    }
    // Get Current Transaction
    if (connector && connector.currentTransactionID) {
      transaction = await this.getTransaction(connector.currentTransactionID);
      if (transaction) {
        // Get User Picture
        if (!this.state.transaction || (transaction && transaction.id !== this.state.transaction.id)) {
          userImage = await this.getUserImage(transaction.user);
        }
      }
    }
    // Check to enable the buttons after a certain period of time
    const startStopTransactionButtonStatus = this.getStartStopTransactionButtonStatus(connector);
    // Compute Duration
    const durationInfos = this.getDurationInfos(transaction, connector);
    // Get the provider
    const securityProvider = this.centralServerProvider.getSecurityProvider();
    // Set
    this.setState({
      chargingStation,
      connector: chargingStation ? Utils.getConnectorFromID(chargingStation, connectorID) : null,
      transaction,
      siteImage: siteImage ? siteImage : this.state.siteImage,
      userImage: userImage ? userImage : transaction ? this.state.userImage : null,
      isAdmin: securityProvider ? securityProvider.isAdmin() : false,
      isSiteAdmin: securityProvider && chargingStation && chargingStation.siteArea ? securityProvider.isSiteAdmin(chargingStation.siteArea.siteID) : false,
      canDisplayTransaction: chargingStation ? this.canDisplayTransaction(chargingStation, connector) : false,
      canStartTransaction: chargingStation ? this.canStartTransaction(chargingStation, connector) : false,
      canStopTransaction: chargingStation ? this.canStopTransaction(chargingStation, connector) : false,
      isPricingActive: securityProvider.isComponentPricingActive(),
      ...startStopTransactionButtonStatus,
      ...durationInfos,
      loading: false
    });
  };

  public canStopTransaction = (chargingStation: ChargingStation, connector: Connector): boolean => {
    // Transaction?
    if (connector && connector.currentTransactionID !== 0) {
      // Get the Security Provider
      const securityProvider = this.centralServerProvider.getSecurityProvider();
      // Check Auth
      return securityProvider.canStopTransaction(chargingStation.siteArea, connector.currentTagID);
    }
    return false;
  };

  public canStartTransaction = (chargingStation: ChargingStation, connector: Connector): boolean => {
    // Transaction?
    if (connector && connector.currentTransactionID === 0) {
      // Get the Security Provider
      const securityProvider = this.centralServerProvider.getSecurityProvider();
      // Check Auth
      return securityProvider.canStartTransaction(chargingStation.siteArea);
    }
    return false;
  };

  public canDisplayTransaction = (chargingStation: ChargingStation, connector: Connector): boolean => {
    // Transaction?
    if (connector && connector.currentTransactionID !== 0) {
      // Get the Security Provider
      const securityProvider = this.centralServerProvider.getSecurityProvider();
      // Check Auth
      return securityProvider.canReadTransaction(chargingStation.siteArea, connector.currentTagID);
    }
    return false;
  };

  public manualRefresh = async () => {
    // Display spinner
    this.setState({ refreshing: true });
    // Refresh
    await this.refresh();
    // Hide spinner
    this.setState({ refreshing: false });
  };

  public startTransactionConfirm = () => {
    const { chargingStation } = this.state;
    Alert.alert(I18n.t('details.startTransaction'), I18n.t('details.startTransactionMessage', { chargeBoxID: chargingStation.id }), [
      { text: I18n.t('general.yes'), onPress: () => this.startTransaction() },
      { text: I18n.t('general.no') }
    ]);
  };

  public startTransaction = async () => {
    const { chargingStation, connector } = this.state;
    try {
      // Check Tag ID
      const userInfo = this.centralServerProvider.getUserInfo();
      if (!userInfo.tagIDs || userInfo.tagIDs.length === 0) {
        Message.showError(I18n.t('details.noBadgeID'));
        return;
      }
      // Disable the button
      this.setState({ buttonDisabled: true });
      // Start the Transaction
      const status = await this.centralServerProvider.startTransaction(chargingStation.id, connector.connectorId, userInfo.tagIDs[0]);
      // Check
      if (status && status.status === 'Accepted') {
        // Show message
        Message.showSuccess(I18n.t('details.accepted'));
        // Nb trials the button stays disabled
        this.setState({ startTransactionNbTrial: START_TRANSACTION_NB_TRIAL });
      } else {
        // Enable the button
        this.setState({ buttonDisabled: false });
        // Show message
        Message.showError(I18n.t('details.denied'));
      }
    } catch (error) {
      // Enable the button
      this.setState({ buttonDisabled: false });
      // Other common Error
      Utils.handleHttpUnexpectedError(this.centralServerProvider, error,
        'transactions.transactionStartUnexpectedError', this.props.navigation, this.refresh);
    }
  };

  public stopTransactionConfirm = async () => {
    const { chargingStation } = this.state;
    // Confirm
    Alert.alert(I18n.t('details.stopTransaction'), I18n.t('details.stopTransactionMessage', { chargeBoxID: chargingStation.id }), [
      { text: I18n.t('general.yes'), onPress: () => this.stopTransaction() },
      { text: I18n.t('general.no') }
    ]);
  };

  public stopTransaction = async () => {
    const { chargingStation, connector } = this.state;
    try {
      // Disable button
      this.setState({ buttonDisabled: true });
      // Stop the Transaction
      const status = await this.centralServerProvider.stopTransaction(chargingStation.id, connector.currentTransactionID);
      // Check
      if (status && status.status === 'Accepted') {
        Message.showSuccess(I18n.t('details.accepted'));
      } else {
        Message.showError(I18n.t('details.denied'));
      }
    } catch (error) {
      // Other common Error
      Utils.handleHttpUnexpectedError(this.centralServerProvider, error,
        'transactions.transactionStopUnexpectedError', this.props.navigation, this.refresh);
    }
  };

  public getStartStopTransactionButtonStatus(connector: Connector): { buttonDisabled?: boolean; startTransactionNbTrial?: number; } {
    const { startTransactionNbTrial } = this.state;
    // Check if the Start/Stop Button should stay disabled
    if (connector &&
      ((connector.status === ChargePointStatus.AVAILABLE && startTransactionNbTrial <= START_TRANSACTION_NB_TRIAL - 2) ||
        (connector.status === ChargePointStatus.PREPARING && startTransactionNbTrial === 0))
    ) {
      // Button are set to available after the nbr of trials
      return {
        buttonDisabled: false
      };
      // Still trials? (only for Start Transaction)
    } else if (startTransactionNbTrial > 0) {
      // Trial - 1
      return {
        startTransactionNbTrial: startTransactionNbTrial > 0 ? startTransactionNbTrial - 1 : 0
      };
      // Transaction ongoing
    } else if (connector && connector.currentTransactionID !== 0) {
      // Transaction has started, enable the buttons again
      return {
        startTransactionNbTrial: 0,
        buttonDisabled: false
      };
      // Transaction is stopped (currentTransactionID == 0)
    } else if (connector && connector.status === ChargePointStatus.FINISHING) {
      // Disable the button until the user unplug the cable
      return {
        buttonDisabled: true
      };
    }
    return {};
  }

  public getDurationInfos = (transaction: Transaction, connector: Connector): { totalInactivitySecs?: number; elapsedTimeFormatted?: string; inactivityFormatted?: string; } => {
    // Transaction loaded?
    if (transaction) {
      let elapsedTimeFormatted = Constants.DEFAULT_DURATION;
      let inactivityFormatted = Constants.DEFAULT_DURATION;
      // Elapsed Time?
      if (transaction.timestamp) {
        // Format
        const durationSecs = (Date.now() - new Date(transaction.timestamp).getTime()) / 1000;
        elapsedTimeFormatted = Utils.formatDurationHHMMSS(durationSecs, false);
      }
      // Inactivity?
      if (transaction.currentTotalInactivitySecs) {
        // Format
        inactivityFormatted = Utils.formatDurationHHMMSS(transaction.currentTotalInactivitySecs, false);
      }
      // Set
      return {
        totalInactivitySecs: transaction.currentTotalInactivitySecs,
        elapsedTimeFormatted,
        inactivityFormatted
      };
    // Basic User: Use the connector data
    } else if (connector && connector.currentTransactionID) {
      let elapsedTimeFormatted = Constants.DEFAULT_DURATION;
      let inactivityFormatted = Constants.DEFAULT_DURATION;
      // Elapsed Time?
      if (connector.currentTransactionDate) {
        // Format
        const durationSecs = (Date.now() - new Date(connector.currentTransactionDate).getTime()) / 1000;
        elapsedTimeFormatted = Utils.formatDurationHHMMSS(durationSecs, false);
      }
      // Inactivity?
      if (connector && connector.currentTotalInactivitySecs) {
        // Format
        inactivityFormatted = Utils.formatDurationHHMMSS(connector.currentTotalInactivitySecs, false);
      }
      // Set
      return {
        totalInactivitySecs: connector ? connector.currentTotalInactivitySecs : 0,
        elapsedTimeFormatted,
        inactivityFormatted
      };
    }
    return {
      elapsedTimeFormatted: Constants.DEFAULT_DURATION
    }
  };

  public renderConnectorStatus = (style: any) => {
    const { connector, isAdmin, isSiteAdmin } = this.state;
    return (
      <View style={style.columnContainer}>
        <ConnectorStatusComponent navigation={this.props.navigation} connector={connector}
          text={connector ? Utils.translateConnectorStatus(connector.status) : ChargePointStatus.UNAVAILABLE} />
        {(isAdmin || isSiteAdmin) && connector && connector.status === ChargePointStatus.FAULTED && (
          <Text style={[style.subLabel, style.subLabelStatusError]}>({connector.errorCode})</Text>
        )}
      </View>
    );
  };

  public renderUserInfo = (style: any) => {
    const { userImage, transaction, isAdmin, isSiteAdmin } = this.state;
    return transaction ? (
      <View style={style.columnContainer}>
        <Thumbnail style={[style.userImage]} source={userImage ? { uri: userImage } : noPhotoActive} />
        <Text numberOfLines={1} style={[style.label, style.labelUser, style.info]}>
          {Utils.buildUserName(transaction.user)}
        </Text>
        {(isAdmin || isSiteAdmin) && <Text style={[style.subLabel, style.subLabelUser, style.info]}>({transaction.tagID})</Text>}
      </View>
    ) : (
        <View style={style.columnContainer}>
          <Thumbnail style={[style.userImage]} source={userImage ? { uri: userImage } : noPhoto} />
          <Text style={[style.label, style.disabled]}>-</Text>
        </View>
      );
  };

  public renderPrice = (style: any) => {
    const { transaction, connector } = this.state;
    let price = 0;
    if (transaction) {
      price = Math.round(transaction.currentCumulatedPrice * 100) / 100;
    }
    return connector && connector.currentTransactionID && transaction && !isNaN(price) ? (
      <View style={style.columnContainer}>
        <Icon type='FontAwesome' name='money' style={[style.icon, style.info]} />
        <Text style={[style.label, style.labelValue, style.info]}>{price}</Text>
        <Text style={[style.subLabel, style.info]}>({transaction.priceUnit})</Text>
      </View>
    ) : (
        <View style={style.columnContainer}>
          <Icon type='FontAwesome' name='money' style={[style.icon, style.disabled]} />
          <Text style={[style.label, style.labelValue, style.disabled]}>-</Text>
        </View>
      );
  };

  public renderInstantPower = (style: any) => {
    const { connector } = this.state;
    return connector && connector.currentTransactionID && !isNaN(connector.currentInstantWatts) ? (
      <View style={style.columnContainer}>
        <Icon type='FontAwesome' name='bolt' style={[style.icon, style.info]} />
        <Text style={[style.label, style.labelValue, style.info]}>
          {connector.currentInstantWatts / 1000 > 0 ? I18nManager.formatNumber(Math.round(connector.currentInstantWatts / 10) / 100) : 0}
        </Text>
        <Text style={[style.subLabel, style.info]}>{I18n.t('details.instant')} (kW)</Text>
      </View>
    ) : (
        <View style={style.columnContainer}>
          <Icon type='FontAwesome' name='bolt' style={[style.icon, style.disabled]} />
          <Text style={[style.label, style.labelValue, style.disabled]}>-</Text>
        </View>
      );
  };

  public renderElapsedTime = (style: any) => {
    const { elapsedTimeFormatted, connector } = this.state;
    return connector && connector.currentTransactionID ? (
      <View style={style.columnContainer}>
        <Icon type='MaterialIcons' name='timer' style={[style.icon, style.info]} />
        <Text style={[style.label, style.labelValue, style.info]}>{elapsedTimeFormatted}</Text>
        <Text style={[style.subLabel, style.info]}>{I18n.t('details.duration')}</Text>
      </View>
    ) : (
        <View style={style.columnContainer}>
          <Icon type='MaterialIcons' name='timer' style={[style.icon, style.disabled]} />
          <Text style={[style.label, style.labelValue, style.disabled]}>-</Text>
        </View>
      );
  };

  public renderInactivity = (style: any) => {
    const { connector, inactivityFormatted } = this.state;
    const inactivityStyle = connector ? Utils.computeInactivityStyle(connector.currentInactivityStatus) : '';
    return connector && connector.currentTransactionID ? (
      <View style={style.columnContainer}>
        <Icon type='MaterialIcons' name='timer-off' style={[style.icon, inactivityStyle]} />
        <Text style={[style.label, style.labelValue, inactivityStyle]}>{inactivityFormatted}</Text>
        <Text style={[style.subLabel, inactivityStyle]}>{I18n.t('details.duration')}</Text>
      </View>
    ) : (
        <View style={style.columnContainer}>
          <Icon type='MaterialIcons' name='timer-off' style={[style.icon, style.disabled]} />
          <Text style={[style.label, style.labelValue, style.disabled]}>-</Text>
        </View>
      );
  };

  public renderTotalConsumption = (style: any) => {
    const { connector } = this.state;
    return connector && connector.currentTransactionID && !isNaN(connector.currentTotalConsumptionWh) ? (
      <View style={style.columnContainer}>
        <Icon style={[style.icon, style.info]} type='MaterialIcons' name='ev-station' />
        <Text style={[style.label, style.labelValue, style.info]}>
          {connector ? I18nManager.formatNumber(Math.round(connector.currentTotalConsumptionWh / 10) / 100) : ''}
        </Text>
        <Text style={[style.subLabel, style.info]}>{I18n.t('details.total')} (kW.h)</Text>
      </View>
    ) : (
        <View style={style.columnContainer}>
          <Icon style={[style.icon, style.disabled]} type='MaterialIcons' name='ev-station' />
          <Text style={[style.label, style.labelValue, style.disabled]}>-</Text>
        </View>
      );
  };

  public renderBatteryLevel = (style: any) => {
    const { transaction, connector } = this.state;
    return connector && connector.currentStateOfCharge && !isNaN(connector.currentStateOfCharge) ? (
      <View style={style.columnContainer}>
        <Icon type='MaterialIcons' name='battery-charging-full' style={[style.icon, style.info]} />
        <Text style={[style.label, style.labelValue, style.info]}>
          {transaction ? `${transaction.stateOfCharge} > ${transaction.currentStateOfCharge}` : connector.currentStateOfCharge}
        </Text>
        <Text style={[style.subLabel, style.info]}>(%)</Text>
      </View>
    ) : (
        <View style={style.columnContainer}>
          <Icon type='MaterialIcons' name='battery-charging-full' style={[style.icon, style.disabled]} />
          <Text style={[style.label, style.labelValue, style.disabled]}>-</Text>
        </View>
      );
  };

  public renderShowLastTransactionButton = (style: any) => {
    const { isAdmin, isSiteAdmin, connector, canStartTransaction } = this.state;
    if ((isAdmin || isSiteAdmin) && canStartTransaction && connector && connector.currentTransactionID === 0) {
      return (
        <TouchableOpacity style={[style.lastTransactionContainer]} onPress={() => this.showLastTransaction()}>
          <View style={[style.buttonLastTransaction]}>
            <Icon style={style.lastTransactionIcon} type='MaterialCommunityIcons' name='history' />
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <View style={[style.lastTransactionContainer]} />
    );
  };

  public renderStartTransactionButton = (style: any) => {
    const { buttonDisabled } = this.state;
    return (
      <TouchableOpacity disabled={buttonDisabled} onPress={() => this.startTransactionConfirm()}>
        <View
          style={
            buttonDisabled
              ? [style.buttonTransaction, style.startTransaction, style.buttonTransactionDisabled]
              : [style.buttonTransaction, style.startTransaction]
          }>
          <Icon
            style={
              buttonDisabled
                ? [style.transactionIcon, style.startTransactionIcon, style.transactionDisabledIcon]
                : [style.transactionIcon, style.startTransactionIcon]
            }
            type='MaterialIcons'
            name='play-arrow'
          />
        </View>
      </TouchableOpacity>
    );
  };

  public renderStopTransactionButton = (style: any) => {
    const { buttonDisabled } = this.state;
    return (
      <TouchableOpacity onPress={() => this.stopTransactionConfirm()} disabled={buttonDisabled}>
        <View
          style={
            buttonDisabled
              ? [style.buttonTransaction, style.stopTransaction, style.buttonTransactionDisabled]
              : [style.buttonTransaction, style.stopTransaction]
          }>
          <Icon
            style={
              buttonDisabled
                ? [style.transactionIcon, style.stopTransactionIcon, style.transactionDisabledIcon]
                : [style.transactionIcon, style.stopTransactionIcon]
            }
            type='MaterialIcons'
            name='stop'
          />
        </View>
      </TouchableOpacity>
    );
  };

  public onBack = () => {
    // Back mobile button: Force navigation
    this.props.navigation.goBack(null);
    // Do not bubble up
    return true;
  };

  public render() {
    const { navigation } = this.props;
    const style = computeStyleSheet();
    const { connector, canStopTransaction, canStartTransaction, chargingStation, loading, siteImage, isPricingActive } = this.state;
    const connectorLetter = Utils.getConnectorLetterFromConnectorID(connector ? connector.connectorId : null);
    return (
      loading ? (
        <Spinner style={style.spinner} color='grey' />
      ) : (
          <Container style={style.container}>
            <HeaderComponent
              navigation={this.props.navigation}
              title={chargingStation ? chargingStation.id : I18n.t('connector.unknown')}
              subTitle={`(${I18n.t('details.connector')} ${connectorLetter})`}
              leftAction={() => this.onBack()}
              leftActionIcon={'navigate-before'}
              rightAction={() => navigation.dispatch(DrawerActions.openDrawer())}
              rightActionIcon={'menu'}
            />
            {/* Site Image */}
            <Image style={style.backgroundImage} source={siteImage ? { uri: siteImage } : noSite} />
            {/* Show Last Transaction */}
            {this.renderShowLastTransactionButton(style)}
            {/* Start/Stop Transaction */}
            {canStartTransaction && connector && connector.currentTransactionID === 0 ? (
              <View style={style.transactionContainer}>
                {this.renderStartTransactionButton(style)}
              </View>
            ) : canStopTransaction && connector && connector.currentTransactionID > 0 ? (
              <View style={style.transactionContainer}>
                {this.renderStopTransactionButton(style)}
              </View>
            ) : (
                  <View style={style.noButtonStopTransaction} />
                )}
            {/* Details */}
            <ScrollView contentContainerStyle={style.scrollViewContainer}
              refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.manualRefresh} />}>
              <View style={style.rowContainer}>
                {this.renderConnectorStatus(style)}
                {this.renderUserInfo(style)}
              </View>
              <View style={style.rowContainer}>
                {this.renderInstantPower(style)}
                {this.renderTotalConsumption(style)}
              </View>
              <View style={style.rowContainer}>
                {this.renderElapsedTime(style)}
                {this.renderInactivity(style)}
              </View>
              <View style={style.rowContainer}>
                {this.renderBatteryLevel(style)}
                {isPricingActive ? this.renderPrice(style) : <View style={style.columnContainer} />}
              </View>
            </ScrollView>
          </Container>
        )
    );
  }
}
