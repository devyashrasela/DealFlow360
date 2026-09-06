import { 
  sequelize, 
  ExchangeRate, 
  ExchangeRateHistory,
  CustomerAccount,
  Quotation,
  Invoice,
  Payment,
  Subscription,
  UpsellRule
} from './src/models/index.js';

const runSync = async () => {
  try {
    console.log('Authenticating...');
    await sequelize.authenticate();
    
    console.log('Syncing specific new models...');
    await ExchangeRate.sync({ alter: true });
    await ExchangeRateHistory.sync({ alter: true });
    
    console.log('Altering existing models with new currency fields...');
    await CustomerAccount.sync({ alter: true });
    await Quotation.sync({ alter: true });
    await Invoice.sync({ alter: true });
    await Payment.sync({ alter: true });
    await Subscription.sync({ alter: true });
    await UpsellRule.sync({ alter: true });
    
    console.log('Database synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync database:', error);
    process.exit(1);
  }
};

runSync();
