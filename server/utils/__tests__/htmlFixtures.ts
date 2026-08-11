// Synthetic fixtures that mirror the column layout of the real Siebel pages
// (captured from .tests/*.html — see flentitlements_fl_*.html and assetagree-*.html).

export function tableHtml(rows: string[]): string {
  return `<table class="tableBorder">${rows.join('')}</table>`
}

interface EntitlementRowFields {
  site: string
  agreeNum: string
  agreeStatus: string
  agreeStart: string
  agreeEnd: string
  svcMatCode: string
  svcMatDesc: string
  withLink: boolean
}

const entitlementDefaults: EntitlementRowFields = {
  site: '0051969849',
  agreeNum: '1-00000000-1',
  agreeStatus: 'Active',
  agreeStart: '2020-01-01',
  agreeEnd: '2030-01-01',
  svcMatCode: '123456',
  svcMatDesc: 'TEST SERVICE',
  withLink: true,
}

// Columns: Site, Account, Agree Num, Agree Name, Contract Num, Contract Line Num,
// Subscription ID, Agree Status, Agree Start Date, Agree End Date, Agree Cancel Date,
// Agree Code, Svc Mat Code, Svc Mat Desc, Entitlement Type, Service Hours,
// Co-Delivery Indicator, Entitlement Fulfilled By, Entitlement Fulfilled By Name
export function entitlementRow(overrides: Partial<EntitlementRowFields> = {}): string {
  const v = { ...entitlementDefaults, ...overrides }
  const agreeNumCell = v.withLink
    ? `<a href="assetagree.aspx?fl=${v.site}&agree_num=${v.agreeNum}&ent_type=ASSET">${v.agreeNum}</a>`
    : v.agreeNum
  return `<tr>
    <td>${v.site}</td><td>Account</td><td>${agreeNumCell}</td><td>Agree Name</td>
    <td></td><td></td><td></td>
    <td>${v.agreeStatus}</td><td>${v.agreeStart}</td><td>${v.agreeEnd}</td><td></td>
    <td>PWM</td><td>${v.svcMatCode}</td><td>${v.svcMatDesc}</td>
    <td>SITEWIDE</td><td>24x7</td><td>N</td>
    <td></td><td></td>
  </tr>`
}

interface DetailRowFields {
  agreeStatus: string
  agreeStart: string
  agreeEnd: string
  assetNum: string
  matCode: string
  matDesc: string
  nickname: string
  prodSkill: string
  minorMat: string
}

const detailDefaults: DetailRowFields = {
  agreeStatus: 'Active',
  agreeStart: '2020-01-01',
  agreeEnd: '2030-01-01',
  assetNum: '1-11111111-1',
  matCode: '397134',
  matDesc: 'TEST MATERIAL',
  nickname: '',
  prodSkill: 'System Management',
  minorMat: 'N',
}

// Columns: Agree Num, Agree Name, Agree Code, Agree Status, Agree Start Date, Agree End Date,
// Asset Num, Quantity, Material Code, Material Desc, SE Code, SE ID, Nickname, Date Created,
// Created By, Last Update, Last Updated By, Prod Group, Prod Family, Prod Skill,
// Minor Material, Co-Delivery Indicator, Entitlement Fulfilled By, Entitlement Fulfilled By Name
export function detailRow(overrides: Partial<DetailRowFields> = {}): string {
  const v = { ...detailDefaults, ...overrides }
  return `<tr>
    <td>1-00000000-1</td><td>Agree Name</td><td>PWM</td><td>${v.agreeStatus}</td>
    <td>${v.agreeStart}</td><td>${v.agreeEnd}</td><td>${v.assetNum}</td><td>1</td>
    <td>${v.matCode}</td><td>${v.matDesc}</td><td></td><td></td>
    <td>${v.nickname}</td><td></td><td></td><td></td>
    <td></td><td>Contact Center</td><td>System Management</td><td>${v.prodSkill}</td>
    <td>${v.minorMat}</td><td>Y</td><td></td><td></td>
  </tr>`
}
