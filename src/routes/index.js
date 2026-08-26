import React from 'react'

const Dashboard = React.lazy(() => import('../resources/views/pages/central/dashboard/Dashboard'))
const Colors = React.lazy(() => import('../resources/views/pages/theme/colors/Colors'))
const Typography = React.lazy(() => import('../resources/views/pages/theme/typography/Typography'))

// Base
const Accordion = React.lazy(() => import('../resources/views/pages/base/accordion/Accordion'))
const Breadcrumbs = React.lazy(() => import('../resources/views/pages/base/breadcrumbs/Breadcrumbs'))
const Cards = React.lazy(() => import('../resources/views/pages/base/cards/Cards'))
const Carousels = React.lazy(() => import('../resources/views/pages/base/carousels/Carousels'))
const Collapses = React.lazy(() => import('../resources/views/pages/base/collapses/Collapses'))
const ListGroups = React.lazy(() => import('../resources/views/pages/base/list-groups/ListGroups'))
const Navs = React.lazy(() => import('../resources/views/pages/base/navs/Navs'))
const Paginations = React.lazy(() => import('../resources/views/pages/base/paginations/Paginations'))
const Placeholders = React.lazy(() => import('../resources/views/pages/base/placeholders/Placeholders'))
const Popovers = React.lazy(() => import('../resources/views/pages/base/popovers/Popovers'))
const Progress = React.lazy(() => import('../resources/views/pages/base/progress/Progress'))
const Spinners = React.lazy(() => import('../resources/views/pages/base/spinners/Spinners'))
const Tabs = React.lazy(() => import('../resources/views/pages/base/tabs/Tabs'))
const Tables = React.lazy(() => import('../resources/views/pages/base/tables/Tables'))
const Tooltips = React.lazy(() => import('../resources/views/pages/base/tooltips/Tooltips'))

// Buttons
const Buttons = React.lazy(() => import('../resources/views/pages/buttons/buttons/Buttons'))
const ButtonGroups = React.lazy(() => import('../resources/views/pages/buttons/button-groups/ButtonGroups'))
const Dropdowns = React.lazy(() => import('../resources/views/pages/buttons/dropdowns/Dropdowns'))

//Forms
const ChecksRadios = React.lazy(() => import('../resources/views/pages/forms/checks-radios/ChecksRadios'))
const FloatingLabels = React.lazy(() => import('../resources/views/pages/forms/floating-labels/FloatingLabels'))
const FormControl = React.lazy(() => import('../resources/views/pages/forms/form-control/FormControl'))
const InputGroup = React.lazy(() => import('../resources/views/pages/forms/input-group/InputGroup'))
const Layout = React.lazy(() => import('../resources/views/pages/forms/layout/Layout'))
const Range = React.lazy(() => import('../resources/views/pages/forms/range/Range'))
const Select = React.lazy(() => import('../resources/views/pages/forms/select/Select'))
const Validation = React.lazy(() => import('../resources/views/pages/forms/validation/Validation'))

const Charts = React.lazy(() => import('../resources/views/pages/charts/Charts'))

// Icons
const CoreUIIcons = React.lazy(() => import('../resources/views/pages/icons/coreui-icons/CoreUIIcons'))
const Flags = React.lazy(() => import('../resources/views/pages/icons/flags/Flags'))
const Brands = React.lazy(() => import('../resources/views/pages/icons/brands/Brands'))

// Notifications
const Alerts = React.lazy(() => import('../resources/views/pages/notifications/alerts/Alerts'))
const Badges = React.lazy(() => import('../resources/views/pages/notifications/badges/Badges'))
const Modals = React.lazy(() => import('../resources/views/pages/notifications/modals/Modals'))
const Toasts = React.lazy(() => import('../resources/views/pages/notifications/toasts/Toasts'))

const Widgets = React.lazy(() => import('../resources/views/pages/widgets/Widgets'))

// Central/Developer/Skeleton Pages
const TokensPage = React.lazy(() => {
  console.log('🔄 Lazy loading TokensPage component...');
  return import('../resources/views/pages/central/developer/skeleton/tokens');
});
const ModulesPage = React.lazy(() => {
  console.log('🔄 Lazy loading ModulesPage component...');
  return import('../resources/views/pages/central/developer/skeleton/modules');
});
const SectionsPage = React.lazy(() => {
  console.log('🔄 Lazy loading SectionsPage component...');
  return import('../resources/views/pages/central/developer/skeleton/sections');
});
const PermissionsPage = React.lazy(() => {
  console.log('🔄 Lazy loading PermissionsPage component...');
  return import('../resources/views/pages/central/developer/skeleton/permissions');
});





// Central/Developer Pages
const UsersPage = React.lazy(() => {
  console.log('🔄 Lazy loading UsersPage component...');
  return import('../resources/views/pages/central/developer/users');
});


// Central/Querynest Pages
const InsertPage = React.lazy(() => {
  console.log('🔄 Lazy loading InsertPage component...');
  return import('../resources/views/pages/central/querynest/insert');
});

// Central/Filters Pages
const ContactsPage = React.lazy(() => {
  console.log('🔄 Lazy loading ContactsPage component...');
  return import('../resources/views/pages/central/filters/contacts');
});

// Central/Filters Pages
const CompaniesPage = React.lazy(() => {
  console.log('🔄 Lazy loading CompaniesPage component...');
  return import('../resources/views/pages/central/filters/companies');
});

// Central/Filters Pages
const ProductsPage = React.lazy(() => {
  console.log('🔄 Lazy loading ProductsPage component...');
  return import('../resources/views/pages/central/filters/products');
});

// Central/Filters Pages
const ProductListPage = React.lazy(() => {
  console.log('🔄 Lazy loading ProductListPage component...');
  return import('../resources/views/pages/central/filters/productlist');
});

// Central/Filters Pages
const NeedToActionPage = React.lazy(() => {
  console.log('🔄 Lazy loading NeedToActionPage component...');
  return import('../resources/views/pages/central/filters/needtoaction');
});

// Central/Emailsystem Pages
const MailconfigPage = React.lazy(() => {
  console.log('🔄 Lazy loading MailconfigPage component...');
  return import('../resources/views/pages/central/emailsystem/mailconfig');
});

// Central/Emailsystem Pages
const EngagePage = React.lazy(() => {
  console.log('🔄 Lazy loading EngagePage component...');
  return import('../resources/views/pages/central/emailsystem/engage');
});

// Central/Emailsystem Pages
const EmailschedulingPage = React.lazy(() => {
  console.log('🔄 Lazy loading EmailschedulingPage component...');
  return import('../resources/views/pages/central/emailsystem/emailscheduling');
});

const AudienceDetailsPage = React.lazy(() => {
  console.log('🔄 Lazy loading AudienceDetailsPage component...');
  return import('../resources/views/pages/central/emailsystem/audience-details');
});



// Central/Emailsystem Pages
const EmaildeliveryPage = React.lazy(() => {
  console.log('🔄 Lazy loading EmaildeliveryPage component...');
  return import('../resources/views/pages/central/emailsystem/emaildelivery');
});

// Central/Querychain Pages
const MasterflowsPage = React.lazy(() => {
  console.log('🔄 Lazy loading MasterflowsPage component...');
  return import('../resources/views/pages/central/querychain/masterflows');
});
const ProcessLogsPage = React.lazy(() => {
  console.log('🔄 Lazy loading ProcessLogsPage component...');
  return import('../resources/views/pages/central/querychain/process-logs');
});

// Central/Emailsystem Pages
const EmailbouncereportsPage = React.lazy(() => {
  console.log('🔄 Lazy loading EmailbouncereportsPage component...');
  return import('../resources/views/pages/central/emailsystem/emailbouncereports');
});

// Central/Querynest Pages
const AddusersPage = React.lazy(() => {
  console.log('🔄 Lazy loading AddusersPage component...');
  return import('../resources/views/pages/central/querynest/addusers');
});

// Central/Crudoperations Pages
const CreatePage = React.lazy(() => {
  console.log('🔄 Lazy loading CreatePage component...');
  return import('../resources/views/pages/central/crudoperations/create');
});

// Central/Crudoperations Pages
const UpdatePage = React.lazy(() => {
  console.log('🔄 Lazy loading UpdatePage component...');
  return import('../resources/views/pages/central/crudoperations/update');
});

// Central/Crudoperations Pages
const DeletePage = React.lazy(() => {
  console.log('🔄 Lazy loading DeletePage component...');
  return import('../resources/views/pages/central/crudoperations/delete');
});








// Central/Automations Pages
const DomainPage = React.lazy(() => {
  console.log('🔄 Lazy loading DomainPage component...');
  return import('../resources/views/pages/central/automations/domain');
});

// Central/Automations Pages
const LinkedinPage = React.lazy(() => {
  console.log('🔄 Lazy loading LinkedinPage component...');
  return import('../resources/views/pages/central/automations/linkedin');
});





// Central/Emailsystem Pages
const DriftemailPage = React.lazy(() => {
  console.log('🔄 Lazy loading DriftemailPage component...');
  return import('../resources/views/pages/central/emailsystem/driftemail');
});

// Central/Filters Pages
const TempmasterleadsPage = React.lazy(() => {
  console.log('🔄 Lazy loading TempmasterleadsPage component...');
  return import('../resources/views/pages/central/filters/tempmasterleads');
});

// Central/Filters Pages
const TempmasteraccountsPage = React.lazy(() => {
  console.log('🔄 Lazy loading TempmasteraccountsPage component...');
  return import('../resources/views/pages/central/filters/tempmasteraccounts');
});

// Central/Filters Pages
const ZoomPage = React.lazy(() => {
  console.log('🔄 Lazy loading ZoomPage component...');
  return import('../resources/views/pages/central/filters/zoom');
});

// Central/Filters Pages
const ApolloPage = React.lazy(() => {
  console.log('🔄 Lazy loading ApolloPage component...');
  return import('../resources/views/pages/central/filters/apollo');
});

// Central/Filters Pages
const OutsourcingdbPage = React.lazy(() => {
  console.log('🔄 Lazy loading OutsourcingdbPage component...');
  return import('../resources/views/pages/central/filters/outsourcingdb');
});

// Central/Filters Pages
const DlslidbPage = React.lazy(() => {
  console.log('🔄 Lazy loading DlslidbPage component...');
  return import('../resources/views/pages/central/filters/dlslidb');
});

// Central/Filters Pages
const KarurdbPage = React.lazy(() => {
  console.log('🔄 Lazy loading KarurdbPage component...');
  return import('../resources/views/pages/central/filters/karurdb');
});

// Central/Filters Pages
const OthersPage = React.lazy(() => {
  console.log('🔄 Lazy loading OthersPage component...');
  return import('../resources/views/pages/central/filters/others');
});

// Central/Filters Pages
const ApolloproductPage = React.lazy(() => {
  console.log('🔄 Lazy loading ApolloproductPage component...');
  return import('../resources/views/pages/central/filters/apolloproduct');
});

// Central/Filters Pages
const LinkedinprodcutPage = React.lazy(() => {
  console.log('🔄 Lazy loading LinkedinprodcutPage component...');
  return import('../resources/views/pages/central/filters/linkedinprodcut');
});

// Central/Filters Pages
const G2productPage = React.lazy(() => {
  console.log('🔄 Lazy loading G2productPage component...');
  return import('../resources/views/pages/central/filters/g2product');
});

// Central/Emailsystem Pages
const EmailsentstatusPage = React.lazy(() => {
  console.log('🔄 Lazy loading EmailsentstatusPage component...');
  return import('../resources/views/pages/central/emailsystem/emailsentstatus');
});

// Central/Emailsystem Pages
const BounceupdatePage = React.lazy(() => {
  console.log('🔄 Lazy loading BounceupdatePage component...');
  return import('../resources/views/pages/central/emailsystem/bounceupdate');
});

// Central/Querynest Pages
const MappingPage = React.lazy(() => {
  console.log('🔄 Lazy loading MappingPage component...');
  return import('../resources/views/pages/central/querynest/mapping');
});



// Central/Queuemanagementmodule Pages
const QueuecontrolcenterPage = React.lazy(() => {
  console.log('🔄 Lazy loading QueuecontrolcenterPage component...');
  return import('../resources/views/pages/central/queuemanagementmodule/queuecontrolcenter');
});

// Central/Filters Pages
const AddtoproductPage = React.lazy(() => {
  console.log('🔄 Lazy loading AddtoproductPage component...');
  return import('../resources/views/pages/central/filters/addtoproduct');
});

// Central/Filters Pages
const RelatedProductsPage = React.lazy(() => {
  console.log('🔄 Lazy loading RelatedProductsPage component...');
  return import('../resources/views/pages/central/filters/relatedproducts');
});

// Central/Querynest Pages
const BulkupdatePage = React.lazy(() => {
  console.log('🔄 Lazy loading BulkupdatePage component...');
  return import('../resources/views/pages/central/querynest/bulkupdate');
});

// Central/Filters Pages
const MspsPage = React.lazy(() => {
  console.log('🔄 Lazy loading MspsPage component...');
  return import('../resources/views/pages/central/filters/msps');
});

// Central/Filters Pages
const MsspsPage = React.lazy(() => {
  console.log('🔄 Lazy loading MsspsPage component...');
  return import('../resources/views/pages/central/filters/mssps');
});

// Central/Automations Pages
const EmailphotoscraperPage = React.lazy(() => {
  console.log('🔄 Lazy loading EmailphotoscraperPage component...');
  return import('../resources/views/pages/central/automations/emailphotoscraper');
});

// Auth Pages
const Login = React.lazy(() => import('../resources/views/pages/auth/Login'));

// Central/Profile Pages
const ProfilePage = React.lazy(() => {
  console.log('🔄 Lazy loading ProfilePage component...');
  return import('../resources/views/pages/central/profile/profile');
});
const SettingsPage = React.lazy(() => {
  console.log('🔄 Lazy loading SettingsPage component...');
  return import('../resources/views/pages/central/profile/settings');
});

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/central/profile', name: 'Profile', element: ProfilePage },
  { path: '/central/profile/settings', name: 'Settings', element: SettingsPage },
  { path: '/theme', name: 'Theme', element: Colors, exact: true },
  { path: '/theme/colors', name: 'Colors', element: Colors },
  { path: '/theme/typography', name: 'Typography', element: Typography },
  { path: '/base', name: 'Base', element: Cards, exact: true },
  { path: '/base/accordion', name: 'Accordion', element: Accordion },
  { path: '/base/breadcrumbs', name: 'Breadcrumbs', element: Breadcrumbs },
  { path: '/base/cards', name: 'Cards', element: Cards },
  { path: '/base/carousels', name: 'Carousel', element: Carousels },
  { path: '/base/collapses', name: 'Collapse', element: Collapses },
  { path: '/base/list-groups', name: 'List Groups', element: ListGroups },
  { path: '/base/navs', name: 'Navs', element: Navs },
  { path: '/base/paginations', name: 'Paginations', element: Paginations },
  { path: '/base/placeholders', name: 'Placeholders', element: Placeholders },
  { path: '/base/popovers', name: 'Popovers', element: Popovers },
  { path: '/base/progress', name: 'Progress', element: Progress },
  { path: '/base/spinners', name: 'Spinners', element: Spinners },
  { path: '/base/tabs', name: 'Tabs', element: Tabs },
  { path: '/base/tables', name: 'Tables', element: Tables },
  { path: '/base/tooltips', name: 'Tooltips', element: Tooltips },
  { path: '/buttons', name: 'Buttons', element: Buttons, exact: true },
  { path: '/buttons/buttons', name: 'Buttons', element: Buttons },
  { path: '/buttons/dropdowns', name: 'Dropdowns', element: Dropdowns },
  { path: '/buttons/button-groups', name: 'Button Groups', element: ButtonGroups },
  { path: '/charts', name: 'Charts', element: Charts },
  { path: '/forms', name: 'Forms', element: FormControl, exact: true },
  { path: '/forms/form-control', name: 'Form Control', element: FormControl },
  { path: '/forms/select', name: 'Select', element: Select },
  { path: '/forms/checks-radios', name: 'Checks & Radios', element: ChecksRadios },
  { path: '/forms/range', name: 'Range', element: Range },
  { path: '/forms/input-group', name: 'Input Group', element: InputGroup },
  { path: '/forms/floating-labels', name: 'Floating Labels', element: FloatingLabels },
  { path: '/forms/layout', name: 'Layout', element: Layout },
  { path: '/forms/validation', name: 'Validation', element: Validation },
  { path: '/icons', exact: true, name: 'Icons', element: CoreUIIcons },
  { path: '/icons/coreui-icons', name: 'CoreUI Icons', element: CoreUIIcons },
  { path: '/icons/flags', name: 'Flags', element: Flags },
  { path: '/icons/brands', name: 'Brands', element: Brands },
  { path: '/notifications', name: 'Notifications', element: Alerts, exact: true },
  { path: '/notifications/alerts', name: 'Alerts', element: Alerts },
  { path: '/notifications/badges', name: 'Badges', element: Badges },
  { path: '/notifications/modals', name: 'Modals', element: Modals },
  { path: '/notifications/toasts', name: 'Toasts', element: Toasts },
  { path: '/widgets', name: 'Widgets', element: Widgets },
  // Central/Developer/Skeleton sections (matching navigation URLs)
  { path: '/central/developer/tokens', name: 'Token Management', element: TokensPage },
  { path: '/central/developer/modules', name: 'Module Management', element: ModulesPage },
  { path: '/central/developer/sections', name: 'Section Management', element: SectionsPage },
  { path: '/central/developer/permissions', name: 'Permission Management', element: PermissionsPage },
  // 
  // Central/Developer sections
  { path: '/central/developer/users', name: 'users', element: UsersPage },

  // Central/Querynest sections
  { path: '/central/querynest/insert', name: 'insert', element: InsertPage },
  { path: '/central/querynest/addusers', name: 'addusers', element: AddusersPage },
  { path: '/central/querynest/mapping', name: 'mapping', element: MappingPage },
  { path: '/central/querynest/bulkupdate', name: 'bulkupdate', element: BulkupdatePage },
  // Central/Filters sections
  { path: '/central/filters/contacts', name: 'contacts', element: ContactsPage },
  { path: '/central/filters/companies', name: 'companies', element: CompaniesPage },
  { path: '/central/filters/products', name: 'products', element: ProductsPage },
  { path: '/central/filters/productlist', name: 'productlist', element: ProductListPage },
  { path: '/central/filters/needtoaction', name: 'need to action', element: NeedToActionPage },
  { path: '/central/filters/tempmasterleads', name: 'tempmasterleads', element: TempmasterleadsPage },
  { path: '/central/filters/tempmasteraccounts', name: 'tempmasteraccounts', element: TempmasteraccountsPage },
  { path: '/central/filters/zoom', name: 'zoom', element: ZoomPage },
  { path: '/central/filters/apollo', name: 'apollo', element: ApolloPage },
  { path: '/central/filters/outsourcingdb', name: 'outsourcingdb', element: OutsourcingdbPage },
  { path: '/central/filters/dlslidb', name: 'dlslidb', element: DlslidbPage },
  { path: '/central/filters/karurdb', name: 'karurdb', element: KarurdbPage },
  { path: '/central/filters/others', name: 'others', element: OthersPage },
  { path: '/central/filters/apolloproduct', name: 'apolloproduct', element: ApolloproductPage },
  { path: '/central/filters/linkedinprodcut', name: 'linkedinprodcut', element: LinkedinprodcutPage },
  { path: '/central/filters/g2product', name: 'g2product', element: G2productPage },
  { path: '/central/filters/addtoproduct', name: 'addtoproduct', element: AddtoproductPage },
  { path: '/central/filters/relatedproducts', name: 'relatedproducts', element: RelatedProductsPage },
  { path: '/central/filters/msps', name: 'msps', element: MspsPage },
  { path: '/central/filters/mssps', name: 'mssps', element: MsspsPage },
  // Central/Emailsystem sections
  { path: '/central/emailsystem/mailconfig', name: 'mailconfig', element: MailconfigPage },
  { path: '/central/emailsystem/engage', name: 'engage', element: EngagePage },
  { path: '/central/emailsystem/emailscheduling', name: 'emailscheduling', element: EmailschedulingPage },
  { path: '/central/emailsystem/audiences/:id', name: 'audience details', element: AudienceDetailsPage },
 
  { path: '/central/emailsystem/emaildelivery', name: 'emaildelivery', element: EmaildeliveryPage },
  { path: '/central/emailsystem/emailbouncereports', name: 'emailbouncereports', element: EmailbouncereportsPage },
  
 
  { path: '/central/emailsystem/driftemail', name: 'driftemail', element: DriftemailPage },
  { path: '/central/emailsystem/emailsentstatus', name: 'emailsentstatus', element: EmailsentstatusPage },
  { path: '/central/emailsystem/bounceupdate', name: 'bounceupdate', element: BounceupdatePage },
  // Central/Querychain sections
  { path: '/central/querychain/masterflows', name: 'masterflows', element: MasterflowsPage },
  { path: '/central/querychain/process-logs', name: 'process-logs', element: ProcessLogsPage },

  // Central/Crudoperations sections
  { path: '/central/crudoperations/create', name: 'create', element: CreatePage },
  { path: '/central/crudoperations/update', name: 'update', element: UpdatePage },
  { path: '/central/crudoperations/delete', name: 'delete', element: DeletePage },

  // Central/Automations sections
  { path: '/central/automations/domain', name: 'domain', element: DomainPage },
  { path: '/central/automations/linkedin', name: 'linkedin', element: LinkedinPage },
 
  { path: '/central/automations/emailphotoscraper', name: 'emailphotoscraper', element: EmailphotoscraperPage },
  // Central/Queuemanagementmodule sections
 
  { path: '/central/queuemanagementmodule/queuecontrolcenter', name: 'queuecontrolcenter', element: QueuecontrolcenterPage },
]

export default routes
export { Login }
