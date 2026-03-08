import React from 'react';
import EmailList from '../../components/mail/EmailList';

const StarredPage: React.FC = () => <EmailList folder="starred" title="Starred" />;
export default StarredPage;
