import { useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';

const dateRanges = [
    { name: 'Today', code: 'today' },
    { name: 'Yesterday', code: 'yesterday' },
    { name: 'This Week', code: 'this_week' },
    { name: 'Last Week', code: 'last_week' },
    { name: 'This Month', code: 'this_month' },
    { name: 'This Year', code: 'this_year' },
    { name: 'Custom', code: 'custom' },
];

const CustomCalendar = ({ dateRange, setDateRange }) => {
    // const [dateRange, setDateRange] = useState();
    const handleRangeChange = (e) => {
        const today = new Date();
        let startDate = null;
        let endDate = null;

        switch (e.code) {
            case 'today':
                startDate = today;
                endDate = today;
                break;
            case 'yesterday': {
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                startDate = yesterday;
                endDate = yesterday;
                break;
            }
            case 'this_week': {
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay());
                startDate = firstDayOfWeek;
                endDate = today;
                break;
            }
            case 'last_week': {
                const lastWeekEnd = new Date(today);
                lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                startDate = lastWeekStart;
                endDate = lastWeekEnd;
                break;
            }
            case 'this_month': {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate = startOfMonth;
                endDate = today;
                break;
            }
            case 'this_year': {
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                startDate = startOfYear;
                endDate = today;
                break;
            }
            case 'custom':
                startDate = today;
                endDate = today;
                break;
            default:
                break;
        }

        setDateRange([startDate, endDate]);
    };
    const [selectedOption, setSelectedOption] = useState({ name: 'Today', code: 'today' });
    const onDropdownChange = (e) => {
        handleRangeChange(e.value)
        setSelectedOption(e.value);
    };

    return (
        <>
            <Dropdown
                value={selectedOption}
                options={dateRanges}
                onChange={onDropdownChange}
                optionLabel="name"
                placeholder="Select an option"
                className='predefined-dropdown'
            />

            {selectedOption && selectedOption.code === 'custom' && (
                <Calendar
                    value={dateRange}
                    selectionMode="range" readOnlyInput hideOnRangeSelection
                    onChange={(e) => setDateRange(e.value)}
                    className='ms-2'
                    showIcon
                />
            )}
        </>
    )

    // return (
    //         <Calendar
    //             value={dateRange}
    //             autoFocus={false} 
    //             onChange={(e) => setDateRange(e.value)}
    //             dateFormat="dd/mm/yy"
    //             selectionMode="range"
    //             className="" 
    //             footerTemplate={() => {
    //                 return (<ul className='d-flex flex-column list-group regular-text h-100'>
    //                     {
    //                         dateRanges.map((item, idx) => {
    //                             return (
    //                                 <li key={idx} className="list-group-item">
    //                                     <button type="button" className='w-100 btn' onClick={() => handleRangeChange(item)}>{item.name}</button></li>
    //                             )
    //                         })
    //                     }
    //                 </ul>)
    //             }}
    //             pt={{
    //                 panel: "d-flex flex-row-reverse"
    //             }}
    //         />
    // );
};

export default CustomCalendar;
