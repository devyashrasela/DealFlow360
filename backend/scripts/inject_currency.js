import fs from 'fs';

const p = '/home/mium/code/DealFlow360/frontend/src/components/layout/TopHeader.jsx';
let content = fs.readFileSync(p, 'utf-8');

const importsOld = `import { useAuth } from '../../context/AuthContext.jsx';`;
const importsNew = `import { useAuth } from '../../context/AuthContext.jsx';\nimport { GLOBAL_CURRENCY, setGlobalCurrency, SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '../../utils/currency.js';`;
if (!content.includes('GLOBAL_CURRENCY')) {
    content = content.replace(importsOld, importsNew);
}

const stateOld = `const [notifOpen, setNotifOpen] = useState(false);`;
const stateNew = `const [notifOpen, setNotifOpen] = useState(false);\n  const [currencyOpen, setCurrencyOpen] = useState(false);\n  const [currency, setLocalCurrency] = useState(GLOBAL_CURRENCY);\n\n  useEffect(() => {\n    const handleCurr = () => setLocalCurrency(GLOBAL_CURRENCY);\n    window.addEventListener('currency_changed', handleCurr);\n    return () => window.removeEventListener('currency_changed', handleCurr);\n  }, []);`;
if (!content.includes('currencyOpen')) {
    content = content.replace(stateOld, stateNew);
}

const uiOld = `{/* Notification Bell */}`;
const uiNew = `{/* Currency Selector */}
        <div className="relative">
          <button 
            onClick={() => setCurrencyOpen(!currencyOpen)}
            className="flex items-center gap-1 p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] transition cursor-pointer text-xs font-semibold"
          >
            {CURRENCY_SYMBOLS[currency]} {currency}
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>
          
          {currencyOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-[#FFFFFF] rounded-xl shadow-xl border border-neutral-200/90 z-50 overflow-hidden py-1">
              {SUPPORTED_CURRENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setGlobalCurrency(c);
                    setCurrencyOpen(false);
                    // trigger a react re-render hack by reloading for hackathon
                    window.location.reload(); 
                  }}
                  className={\`w-full text-left px-4 py-2 text-xs hover:bg-[#F3F2F2] flex items-center justify-between \${c === currency ? 'text-[#724B66] font-bold bg-[#724B66]/5' : 'text-[#2E3141]'}\`}
                >
                  <span>{c}</span>
                  <span className="text-neutral-400 font-normal">{CURRENCY_SYMBOLS[c]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}`;

if (!content.includes('Currency Selector')) {
    content = content.replace(uiOld, uiNew);
}

fs.writeFileSync(p, content, 'utf-8');
console.log('Injected Currency Selector into TopHeader');
