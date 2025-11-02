// module.exports = {
//     Button: () => 'Button', 
//     Divider:() =>'Divider'
// }
import React from 'react';
// Mocking all PrimeReact components to return simple divs
module.exports = new Proxy({}, {
    get: (target, prop) => {
      return prop === '__esModule' ? {} : (props) => React.createElement('div', props);
    }
  });