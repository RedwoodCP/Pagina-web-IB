import type { ReactNode } from "react";

// Texto aprobado y proporcionado por Redwood Capital Partners (julio de 2025). Se reproduce sin cambios de contenido;
// solo se le da formato. Cualquier modificación debe venir del área jurídica.

const S = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <section className="mt-32">
    <h2 className="h2" style={{ fontSize: 20 }}>{n}. {title}</h2>
    <div className="legal-body">{children}</div>
  </section>
);
const L = ({ items }: { items: string[] }) => (
  <ul>
    {items.map((i) => <li key={i}>{i}</li>)}
  </ul>
);
const Mail = () => <a href="mailto:legal@redwood.ventures">legal@redwood.ventures</a>;

export function PrivacyPolicy() {
  return (
    <article lang="en" className="legal-body">
      <div className="eyebrow">Redwood Capital Partners</div>
      <h1 className="h1-lg mt-12">Privacy Policy</h1>
      <p className="c-lead mt-8">Effective Date: 16 July, 2025</p>
      <p className="mt-24">
        This Privacy Policy describes how personal data is collected, used, stored, and disclosed by a group of private investment funds (venture capital and
        private equity), each with independent management entities incorporated in different jurisdictions, including Delaware (USA), Canada, and other
        international financial centers. The Policy applies to the common website operated on behalf of the group, and to all natural persons interacting with or
        providing data to any of the funds covered herein.
      </p>

      <S n={1} title="Identity and Contact of the Data Controller">
        <p>Each fund operates independently through its respective management entity. For all privacy-related matters, the designated point of contact is:</p>
        <p>Email: <Mail /></p>
        <p>This email may be used by data subjects to exercise their rights or submit inquiries related to privacy.</p>
      </S>

      <S n={2} title="Scope of the Policy">
        <p>This Policy applies to all individuals whose personal data may be collected or processed by the funds, including:</p>
        <L items={["Investors and limited partners (LPs)", "Employees and contractors", "Advisors and consultants", "Representatives of portfolio companies", "Visitors and users of the group’s website and landing pages"]} />
        <p>
          The Policy is applicable regardless of jurisdiction and reflects standards that comply with multiple data protection laws, including but not limited to
          the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA/CPRA), and PIPEDA (Canada).
        </p>
        <p>The Policy also applies to cross-border interactions with parties located in Latin America, Asia, and offshore jurisdictions.</p>
      </S>

      <S n={3} title="Categories of Personal Data Collected">
        <p>Depending on the relationship with the data subject, the funds may collect the following categories of personal data:</p>
        <p><strong>For investors and LPs:</strong></p>
        <L items={["Full name, nationality, contact details", "Identification documents (e.g., passport, driver’s license)", "Tax and financial information (e.g., bank account, KYC forms, source of funds)"]} />
        <p><strong>For employees and contractors:</strong></p>
        <L items={["Name, contact details, address", "Curriculum vitae, academic background", "Employment documents and identification"]} />
        <p><strong>For portfolio company representatives:</strong></p>
        <L items={["Name and contact information", "Professional and corporate documents", "KYC documentation and contracts"]} />
        <p><strong>For website users:</strong></p>
        <L items={["Name, email address, company affiliation", "Information voluntarily submitted through contact or pitch forms"]} />
      </S>

      <S n={4} title="Collection Methods">
        <p>Personal data may be collected through the following means:</p>
        <L items={["Subscription documents and onboarding forms", "KYC/AML procedures", "Web forms and landing pages", "Direct communications via email (e.g., Microsoft 365)", "Third-party platforms used by the funds, including Mailchimp, Airtable, Noloco, and Docusign"]} />
      </S>

      <S n={5} title="Purposes of Data Processing">
        <p>The funds may use personal data for the following purposes:</p>
        <L
          items={[
            "Verification of identity and compliance with anti-money laundering (AML) obligations",
            "Investor relations and fund administration",
            "Processing contributions and disbursements",
            "Regulatory compliance with authorities such as the SEC, FINTRAC, SAT",
            "Human resources and contractor management",
            "Marketing and communication of new investment vehicles or opportunities",
          ]}
        />
        <p>Where required by applicable law, data will only be processed with the express consent of the data subject.</p>
      </S>

      <S n={6} title="Legal Basis for Processing">
        <p>Data processing is based on one or more of the following legal grounds:</p>
        <L items={["The consent of the data subject", "The performance of contractual obligations", "The fund’s legitimate interest in operating, evaluating, and expanding its investment activities", "Compliance with legal and regulatory obligations"]} />
        <p>This Policy is designed to comply with applicable privacy and data protection laws in the jurisdictions in which we operate</p>
      </S>

      <S n={7} title="International Data Transfers">
        <p>
          Personal data may be stored or processed on servers located in the United States, Canada, or other countries where the group’s third-party service
          providers operate. These providers include Microsoft 365, Mailchimp, Airtable, Noloco, and Docusign.
        </p>
        <p>
          Where applicable, we take appropriate steps to ensure that cross-border transfers of personal data are carried out in accordance with applicable data
          protection laws and with adequate safeguards.
        </p>
        <p>
          Where data is transferred across jurisdictions, appropriate safeguards will be implemented, such as standard contractual clauses, data protection
          agreements, and technical security measures.
        </p>
      </S>

      <S n={8} title="Third-Party Service Providers">
        <p>The funds may share data with external advisors or service providers for specific functions, including:</p>
        <L items={["Legal, tax, accounting, and auditing services (including a fiduciary bank and law firms in Mexico and the U.S.)", "IT and document management platforms"]} />
        <p>All such providers are subject to confidentiality obligations and contractual clauses that ensure data protection standards equivalent to this Policy.</p>
      </S>

      <S n={9} title="Data Retention">
        <p>
          Personal data will be retained only for as long as necessary to fulfill the purposes for which it was collected and to comply with legal and regulatory
          obligations. Unless otherwise required, data will be retained for up to seven (7) years following the closure of the fund or the end of the relationship
          with the data subject.
        </p>
        <p>We are currently reviewing and categorizing data types to apply tailored retention periods aligned with legal, regulatory, and business needs.</p>
      </S>

      <S n={10} title="Data Subject Rights">
        <p>Data subjects may exercise their rights under applicable laws, including:</p>
        <L items={["Access to their data", "Rectification of inaccurate information", "Deletion of personal data", "Objection to processing", "Data portability"]} />
        <p>Requests can be submitted to <Mail />.</p>
        <p>
          To exercise these rights, please send an email indicating the right you wish to exercise, along with a copy of a valid government-issued ID. Upon
          verification of identity, requests will be responded to within 30 days.
        </p>
      </S>

      <S n={11} title="Data Security Measures">
        <p>The funds implement technical and organizational measures to safeguard personal data, including:</p>
        <L
          items={[
            "Controlled access within Microsoft 365 environment",
            "Role-based access limitations",
            "Use of passwords for user authentication",
            "Execution of NDAs and inclusion of privacy clauses in contracts with relevant third parties",
            "Internal practices for the responsible handling of sensitive information",
          ]}
        />
        <p>
          Although the group is not formally certified under cybersecurity frameworks, it strives to follow generally accepted information security practices
          inspired by ISO/IEC 27001 and NIST principles.
        </p>
      </S>

      <S n={12} title="Cookies and Tracking Technologies">
        <p>The website and its landing pages use cookies, including:</p>
        <L items={["Technical cookies necessary for site functionality", "Analytical cookies for usage statistics", "Marketing cookies used in campaigns"]} />
        <p>Users can configure their browser settings to reject cookies or manage their preferences via a cookie banner where applicable.</p>
      </S>

      <S n={13} title="Updates to This Policy">
        <p>
          This Policy may be updated from time to time. Any changes will be published on the website and indicated with an updated effective date. Users are
          encouraged to review the Policy periodically.
        </p>
      </S>

      <S n={14} title="Incident Management">
        <p>Although no internal breach management policy is formally adopted, the group will make reasonable efforts to:</p>
        <L items={["Identify and contain any security incident", "Notify affected individuals and/or authorities where legally required", "Cooperate with relevant regulators and implement corrective measures"]} />
        <p>A simplified internal process is being developed to help track and learn from potential security incidents, in line with internal risk management priorities.</p>
        <p className="mt-24">For any inquiries regarding this Privacy Policy, please contact:</p>
        <p><Mail /></p>
      </S>
    </article>
  );
}
