import { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [heatingData, setHeatingData] = useState(null);
  const [yearData, setYearData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [showFullYear, setShowFullYear] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [locations, setLocations] = useState(['Vantaa']);
  const [selectedLocation, setSelectedLocation] = useState('Vantaa');

  const months = [
    { name: 'January', roman: 'I' },
    { name: 'February', roman: 'II' },
    { name: 'March', roman: 'III' },
    { name: 'April', roman: 'IV' },
    { name: 'May', roman: 'V' },
    { name: 'June', roman: 'VI' },
    { name: 'July', roman: 'VII' },
    { name: 'August', roman: 'VIII' },
    { name: 'September', roman: 'IX' },
    { name: 'October', roman: 'X' },
    { name: 'November', roman: 'XI' },
    { name: 'December', roman: 'XII' }
  ];

  useEffect(() => {
    const years = Array.from({ length: 18 }, (_, i) => new Date().getFullYear() - i);
    setAvailableYears(years);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setHeatingData(null);
        setYearData(null);

        const response = await axios.get(
          `http://cdn.fmi.fi/weather-observations/products/heating-degree-days/lammitystarveluvut-${year}.utf8.csv`
        );

        Papa.parse(response.data, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (!results.data || results.data.length === 0) {
              setError('No data available for this year');
              return;
            }

            const locationColumn = Object.keys(results.data[0] || {}).find(
              key => key.includes('Lämmitystarveluvut') || key.includes('°Cvrk)')
            );

            if (!locationColumn) {
              setError('Could not find location column in CSV data');
              return;
            }

            const availableLocs = results.data
              .map(row => row[locationColumn])
              .filter(Boolean)
              .filter((loc, index, self) => self.indexOf(loc) === index);

            setLocations(availableLocs);

            const locationRow = results.data.find(row =>
              row[locationColumn] && (
                row[locationColumn].includes(selectedLocation) ||
                row[locationColumn].toLowerCase().includes(selectedLocation.toLowerCase())
              )
            );

            if (!locationRow) {
              setError(`No data found for ${selectedLocation}. Available locations: ${availableLocs.join(', ') || 'none'}`);
              return;
            }

            if (showFullYear) {
              const monthValues = months.map(m => {
                const val = locationRow[m.roman];
                return val !== undefined && val !== '' ? parseFloat(val) : null;
              });

              const total = monthValues.reduce((sum, v) => sum + (v ?? 0), 0);

              setYearData({
                location: locationRow[locationColumn],
                year,
                monthValues,
                total: Math.round(total)
              });
            } else {
              const monthRoman = months[month].roman;
              const heatingValue = locationRow[monthRoman];

              if (heatingValue === undefined) {
                setError(`No data found for ${months[month].name}`);
                return;
              }

              setHeatingData({
                location: locationRow[locationColumn],
                month: `${months[month].name} ${year}`,
                heatingRequirement: heatingValue,
                dataYear: year
              });
            }
          },
          error: (err) => {
            setError(`Error parsing CSV: ${err.message}`);
          }
        });
      } catch (err) {
        setError(`Error fetching data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, month, selectedLocation, showFullYear]);

  const handleYearChange = (e) => setYear(parseInt(e.target.value));
  const handleMonthChange = (e) => {
    const val = e.target.value;
    if (val === 'full') {
      setShowFullYear(true);
    } else {
      setShowFullYear(false);
      setMonth(parseInt(val));
    }
  };
  const handleLocationChange = (e) => setSelectedLocation(e.target.value);

  const chartData = yearData ? {
    labels: months.map(m => m.name.slice(0, 3)),
    datasets: [
      {
        label: 'Degree-days',
        data: yearData.monthValues,
        backgroundColor: '#378ADD',
        borderRadius: 4,
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y ?? 'N/A'} °Cvrk`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: '°Cvrk' }
      }
    }
  };

  return (
    <div className="app">
      <h1>Heating Requirement Data</h1>

      <div className="controls">
        <div className="control-group">
          <label htmlFor="location">Location: </label>
          <select id="location" value={selectedLocation} onChange={handleLocationChange}>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="year">Year: </label>
          <select id="year" value={year} onChange={handleYearChange}>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="month">Period: </label>
          <select id="month" value={showFullYear ? 'full' : month} onChange={handleMonthChange}>
            <option value="full">Full year</option>
            {months.map((m, index) => (
              <option key={m.roman} value={index}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading data...</p>}
      {error && <p className="error">Error: {error}</p>}

      {heatingData && !loading && !error && (
        <div className="data-display">
          <h2>{heatingData.location}</h2>
          <p>Month: {heatingData.month}</p>
          <p>Heating Requirement: {heatingData.heatingRequirement} degree-days</p>
          <p>Data year: {heatingData.dataYear}</p>
        </div>
      )}

      {yearData && !loading && !error && (
        <div className="data-display">
          <h2>{yearData.location} — {yearData.year}</h2>
          <p>Annual total: <strong>{yearData.total} °Cvrk</strong></p>
          <div style={{ position: 'relative', height: '300px', marginTop: '1rem' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Monthly data</h3>
              <button
                onClick={() => {
                  const header = `Location\tYear\tMonth\tDegree-days (°Cvrk)`;
                  const rows = months.map((m, i) =>
                    `${yearData.location}\t${yearData.year}\t${m.name}\t${yearData.monthValues[i] ?? ''}`
                  );
                  const footer = `${yearData.location}\t${yearData.year}\tTotal\t${yearData.total}`;
                  navigator.clipboard.writeText([header, ...rows, footer].join('\n'));
                }}
                style={{ padding: '0.3rem 0.8rem', cursor: 'pointer' }}
              >
                Copy to clipboard
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Month</th>
                  <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Degree-days (°Cvrk)</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m.roman} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)' }}>
                    <td style={{ padding: '0.4rem 0.6rem' }}>{m.name}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      {yearData.monthValues[i] ?? '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #ccc', fontWeight: 'bold' }}>
                  <td style={{ padding: '0.4rem 0.6rem' }}>Total</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{yearData.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="info">
        <p>Data source: <a href="https://www.fmi.fi" target="_blank" rel="noopener noreferrer">Finnish Meteorological Institute (FMI)</a></p>
      </div>
    </div>
  );
}

export default App;