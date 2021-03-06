import ChargingStation from '../types/ChargingStation';
import User from './User';

export enum InactivityStatus {
  INFO = 'I',
  WARNING = 'W',
  ERROR = 'E'
}

export default interface Transaction {
  id: number;
  siteID: string;
  siteAreaID: string;
  connectorId: number;
  tagID: string;
  userID: string;
  chargeBoxID: string;
  signedData?: any;
  user?: User;
  stop?: {
    tagID: string;
    userID: string;
    user?: User;
    meterStop: number;
    price: number;
    roundedPrice: number;
    priceUnit: string;
    pricingSource: string;
    stateOfCharge: number;
    totalInactivitySecs: number;
    extraInactivitySecs: number;
    inactivityStatus?: InactivityStatus;
    totalConsumptionWh: number;
    totalDurationSecs: number;
    timestamp: Date;
    transactionData?: any;
    signedData?: any;
  };
  remotestop?: {
    timestamp: Date;
    tagID: string;
    userID: string;
  };
  refundData?: {
    refundId: string;
    refundedAt: Date;
    type: any;
    reportId?: string;
    status?: any;
  };
  chargeBox?: ChargingStation;
  meterStart: number;
  timestamp: Date;
  price: number;
  roundedPrice: number;
  priceUnit: string;
  pricingSource: string;
  stateOfCharge: number;
  timezone: string;
  currentTimestamp?: Date;
  currentTotalInactivitySecs: number;
  currentInactivityStatus?: InactivityStatus;
  currentStateOfCharge: number;
  numberOfMeterValues: number;
  currentInstantWatts: number;
  currentInstantWattsL1?: number;
  currentInstantWattsL2?: number;
  currentInstantWattsL3?: number;
  currentInstantWattsDC?: number;
  currentConsumptionWh?: number;
  currentCumulatedPrice: number;
  currentTotalConsumptionWh: number;
  currentTotalDurationSecs: number;
  currentSignedData?: number;
  currentInstantVolts?: number;
  currentInstantVoltsL1?: number;
  currentInstantVoltsL2?: number;
  currentInstantVoltsL3?: number;
  currentInstantVoltsDC?: number;
  currentInstantAmps?: number;
  currentInstantAmpsL1?: number;
  currentInstantAmpsL2?: number;
  currentInstantAmpsL3?: number;
  currentInstantAmpsDC?: number;
  uniqueId?: string;
  errorCode?: number;
  values?: TransactionConsumption[]
}

export interface TransactionConsumption {
  date: Date;
  instantWatts: number;
  instantWattsL1: number;
  instantWattsL2: number;
  instantWattsL3: number;
  instantWattsDC: number;
  instantAmps: number;
  instantAmpsL1: number;
  instantAmpsL2: number;
  instantAmpsL3: number;
  instantAmpsDC: number;
  instantVolts: number;
  instantVoltsL1: number;
  instantVoltsL2: number;
  instantVoltsL3: number;
  instantVoltsDC: number;
  limitWatts: number;
  limitAmps: number;
  cumulatedConsumptionWh: number;
  cumulatedConsumptionAmps: number;
  stateOfCharge: number;
  cumulatedAmount: number;
}
