import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as SDK from 'azure-devops-extension-sdk';
import SettingsView from './SettingsView';

SDK.init().then(() => {
  SDK.ready().then(() => {
    ReactDOM.render(
      React.createElement(SettingsView),
      document.getElementById('root')
    );
  });
});