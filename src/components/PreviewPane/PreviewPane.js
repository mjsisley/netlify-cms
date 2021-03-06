import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { List, Map } from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { ScrollSyncPane } from '../ScrollSync';
import registry from '../../lib/registry';
import { resolveWidget } from '../Widgets';
import { selectTemplateName, selectInferedField } from '../../reducers/collections';
import { INFERABLE_FIELDS } from '../../constants/fieldInference';
import Preview from './Preview';
import styles from './PreviewPane.css';

export default class PreviewPane extends React.Component {

  componentDidUpdate() {
    this.renderPreview();
  }

  getWidget = (field, value, props) => {
    const { fieldsMetaData, getAsset } = props;
    const widget = resolveWidget(field.get('widget'));
    return React.createElement(widget.preview, {
      field,
      key: field.get('name'),
      value: value && Map.isMap(value) ? value.get(field.get('name')) : value,
      metadata: fieldsMetaData && fieldsMetaData.get(field.get('name')),
      getAsset,
    });
  };

  inferedFields = {};

  inferFields() {
    const titleField = selectInferedField(this.props.collection, 'title');
    const shortTitleField = selectInferedField(this.props.collection, 'shortTitle');
    const authorField = selectInferedField(this.props.collection, 'author');

    this.inferedFields = {};
    if (titleField) this.inferedFields[titleField] = INFERABLE_FIELDS.title;
    if (shortTitleField) this.inferedFields[shortTitleField] = INFERABLE_FIELDS.shortTitle;
    if (authorField) this.inferedFields[authorField] = INFERABLE_FIELDS.author;
  }

  widgetFor = (name) => {
    const { fields, entry } = this.props;
    const field = fields.find(f => f.get('name') === name);
    let value = entry.getIn(['data', field.get('name')]);
    const labelledWidgets = ['string', 'text', 'number'];
    if (Object.keys(this.inferedFields).indexOf(name) !== -1) {
      value = this.inferedFields[name].defaultPreview(value);
    } else if (value && labelledWidgets.indexOf(field.get('widget')) !== -1 && value.toString().length < 50) {
      value = <div><strong>{field.get('label')}:</strong> {value}</div>;
    }

    return value ? this.getWidget(field, value, this.props) : null;
  };

  widgetsFor = (name) => {
    const { fields, entry } = this.props;
    const field = fields.find(f => f.get('name') === name);
    const nestedFields = field && field.get('fields');
    const value = entry.getIn(['data', field.get('name')]);

    if (List.isList(value)) {
      return value.map((val, index) => {
        const widgets = nestedFields && Map(nestedFields.map((f, i) => [f.get('name'), <div key={i}>{this.getWidget(f, val, this.props)}</div>]));
        return Map({ data: val, widgets });
      });
    }

    return Map({
      data: value,
      widgets: nestedFields && Map(nestedFields.map(f => [f.get('name'), this.getWidget(f, value, this.props)])),
    });
  };

  handleIframeRef = (ref) => {
    if (ref) {
//       TODO: We want the Head and Body to be used in the iframe from the Preview Template
      
//       registry.getPreviewStyles().forEach((style) => {
//         const linkEl = document.createElement('link');
//         linkEl.setAttribute('rel', 'stylesheet');
//         linkEl.setAttribute('href', style);
//         ref.contentDocument.head.appendChild(linkEl);
//       });
//       const base = document.createElement('base');
//       base.setAttribute('target', '_blank');
//       ref.contentDocument.head.appendChild(base);

      this.previewEl = document.createElement('div');
//       this.iframeBody = ref.contentDocument.body;
      this.iframeBodyAndHead = ref.contentDocument;
//       this.iframeBody.appendChild(this.previewEl);      
      this.renderPreview();
    }
  };

  renderPreview() {
    const { entry, collection } = this.props;
    if (!entry || !entry.get('data')) return;
    const component = registry.getPreviewTemplate(selectTemplateName(collection, entry.get('slug'))) || Preview;

    this.inferFields();

    const previewProps = {
      ...this.props,
      widgetFor: this.widgetFor,
      widgetsFor: this.widgetsFor,
    };

    // We need to use this API in order to pass context to the iframe
    ReactDOM.unstable_renderSubtreeIntoContainer(
      this,
      <ScrollSyncPane attachTo={this.iframeBodyAndHead}>
        {React.createElement(component, previewProps)}
      </ScrollSyncPane>
      , this.previewEl);
  }

  render() {
    const { collection } = this.props;
    if (!collection) {
      return null;
    }

    return <iframe className={styles.frame} ref={this.handleIframeRef} />;
  }
}

PreviewPane.propTypes = {
  collection: ImmutablePropTypes.map.isRequired,
  fields: ImmutablePropTypes.list.isRequired,
  entry: ImmutablePropTypes.map.isRequired,
  fieldsMetaData: ImmutablePropTypes.map.isRequired,
  getAsset: PropTypes.func.isRequired,
};
