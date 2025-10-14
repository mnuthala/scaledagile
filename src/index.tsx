import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TimelineView from './TimelineView';

const isAzureDevOpsContext = typeof window !== 'undefined' && (window as any).SDK;

if (isAzureDevOpsContext) {
  import('azure-devops-extension-sdk').then(SDK => {
    SDK.init().then(() => {
      SDK.ready().then(() => {
        ReactDOM.render(
          React.createElement(TimelineView),
          document.getElementById('root')
        );
      });
    });
  });
} else {
  ReactDOM.render(
    React.createElement(TimelineView),
    document.getElementById('root')
  );
}