
import React from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';

const BBreadCrumb = ({ breadcrumbItems, separator }) => {
  return (
    <div className='custom-breadcrumb'>
      <BreadCrumb model={breadcrumbItems} className='bg-transparent regular-text p-0' separatorIcon={separator} pt={{ menu: "p-0" }}/>
    </div> 
  );
};

export default BBreadCrumb;
