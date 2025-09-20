import { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [heatingData, setHeatingData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
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
    const years = Array.from({length: 18}, (_, i) => new Date().getFullYear() - i);
    setAvailableYears(years);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
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
            
            // Extract all available locations
            const availableLocs = results.data
              .map(row => row[locationColumn])
              .filter(Boolean)
              .filter((loc, index, self) => self.indexOf(loc) === index);
            
            setLocations(availableLocs);
            
            // Find data for selected location (flexible matching)
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
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error.message}`);
          }
        });
      } catch (err) {
        setError(`Error fetching data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, month, selectedLocation]);

  const handleYearChange = (e) => {
    setYear(parseInt(e.target.value));
  };

  const handleMonthChange = (e) => {
    setMonth(parseInt(e.target.value));
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
  };

  return (
    <div className="app">
      <h1>Heating Requirement Data</h1>
      
      <div className="controls">
        <div className="control-group">
          <label htmlFor="location">Location: </label>
          <select 
            id="location" 
            value={selectedLocation} 
            onChange={handleLocationChange}
          >
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
          <label htmlFor="month">Month: </label>
          <select id="month" value={month} onChange={handleMonthChange}>
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
      
      <div className="info">
        <p>Data source: <a href="https://www.fmi.fi" target="_blank" rel="noopener noreferrer">Finnish Meteorological Institute (FMI)</a></p>
      </div>
    </div>
  );
}

export default App;
