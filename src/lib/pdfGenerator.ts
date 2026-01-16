import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UnifiedFixPlan } from '@/constants/model';

// Extend jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: typeof autoTable;
  lastAutoTable?: {
    finalY: number;
  };
}

export class FixPlanPDFGenerator {
  private doc: jsPDFWithAutoTable;
  private pageWidth: number;
  private pageHeight: number;
  private margin = 10;
  private currentY = this.margin;
  private boxWidth = 46;
  private boxHeight = 20;
  
  // Colors
  private readonly primaryColor = "#2563eb"; // blue-600
  private readonly dangerColor = "#dc2626"; // red-600
  private readonly warningColor = "#f59e0b"; // amber-500
  private readonly successColor = "#16a34a"; // green-600
  private readonly textColor = "#374151"; // gray-700
  private readonly darkTextColor = "#1f2937"; // gray-800
  private readonly mutedTextColor = "#6b7280"; // gray-500
  
  // Fonts
  private readonly fontFamily = "helvetica";
  private readonly codeFont = "consolas";
  
  // Font sizes
  private readonly titleSize = 20;
  private readonly subtitleSize = 16;
  private readonly sectionHeaderSize = 14;
  private readonly metricLabelSize = 12;
  private readonly normalTextSize = 10;
  private readonly smallTextSize = 9;
  private readonly codeTextSize = 10;
  private readonly coverTitleSize = 28;

  constructor() {
    this.doc = new jsPDF() as jsPDFWithAutoTable;
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private checkPageBreak(height: number = 20) {
    if (this.currentY + height > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
      return true;
    }
    return false;
  }

  private addTitle(text: string, fontSize: number = this.titleSize) {
    this.checkPageBreak(15);
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(this.primaryColor);
    this.doc.setFont(this.fontFamily, "bold");
    this.doc.text(text, this.margin, this.currentY);
    this.currentY += fontSize / 2 + 2;
  }

  private addSectionHeader(text: string, fontSize: number = this.sectionHeaderSize) {
    this.checkPageBreak(12);
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(this.darkTextColor);
    this.doc.setFont(this.fontFamily, "bold");
    this.doc.text(text, this.margin, this.currentY);
    this.currentY += fontSize / 2 + 2;
  }

  private addText(
    text: string,
    fontSize: number = this.normalTextSize,
    color: string = this.textColor,
    isBold: boolean = false
  ) {
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(color);
    this.doc.setFont(this.fontFamily, isBold ? "bold" : "normal");

    const lines = this.doc.splitTextToSize(
      text,
      this.pageWidth - 2 * this.margin
    );
    lines.forEach((line: string) => {
      this.checkPageBreak(fontSize / 2);
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += fontSize / 2 + 2;
    });
  }

  private addBulletPoint(text: string, indent: number = 5, isBold: boolean = false) {
    this.doc.setFontSize(this.normalTextSize);
    this.doc.setTextColor(this.textColor);
    this.doc.setFont(this.fontFamily, isBold ? "bold" : "normal");

    const lines = this.doc.splitTextToSize(
      text,
      this.pageWidth - 2 * this.margin - indent - 5
    );
    lines.forEach((line: string, i: number) => {
      this.checkPageBreak(7);
      if (i === 0) this.doc.text("•", this.margin + indent, this.currentY);
      this.doc.text(line, this.margin + indent + 5, this.currentY);
      this.currentY += 6;
    });
  }

  private addMetricBox(
    label: string,
    value: string | number,
    color: string = this.primaryColor,
    positionX: number = this.margin,
    positionY: number = this.currentY
  ) {
    this.checkPageBreak(this.boxHeight + 5);

    // Draw box
    this.doc.setDrawColor(color);
    this.doc.setLineWidth(0.5);
    this.doc.rect(positionX, positionY, this.boxWidth, this.boxHeight);

    // Add label
    this.doc.setFontSize(this.metricLabelSize);
    this.doc.setTextColor(this.mutedTextColor);
    this.doc.setFont(this.fontFamily, "bold");
    this.doc.text(label, positionX + 2, positionY + 6);

    // Add value
    this.doc.setFontSize(this.metricLabelSize);
    this.doc.setFont(this.fontFamily, "bold");
    this.doc.setTextColor(color);
    this.doc.text(String(value), positionX + 2, positionY + this.boxHeight - 4);

    return this.boxWidth + 5;
  }

  private addTable(
    headers: string[],
    rows: (string | number)[][],
    columnWidths?: number[]
  ) {
    this.checkPageBreak(20);

    autoTable(this.doc, {
      head: [headers],
      body: rows,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      theme: "grid",
      headStyles: {
        fillColor: this.primaryColor,
        textColor: "#ffffff",
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: this.smallTextSize,
        textColor: this.textColor,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: "#f9fafb",
      },
      columnStyles: columnWidths
        ? Object.fromEntries(
            columnWidths.map((width, i) => [i, { cellWidth: width }])
          )
        : {},
    });

    this.currentY =
      (this.doc as jsPDFWithAutoTable).lastAutoTable?.finalY || this.currentY;
    this.currentY += 5;
  }

  private addSpacer(height: number = 5) {
    this.currentY += height;
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold **text**
      .replace(/\*(.*?)\*/g, "$1") // Remove italic *text*
      .replace(/`(.*?)`/g, "$1") // Remove inline code `text`
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Remove links [text](url)
      .replace(/^#+\s/gm, "") // Remove heading markers
      .replace(/^[-*]\s/gm, ""); // Remove bullet points
  }

  private generateCoverPage(repoName: string) {
    this.currentY = this.pageHeight / 3;

    this.doc.setFontSize(this.coverTitleSize);
    this.doc.setTextColor(this.primaryColor);
    this.doc.setFont(this.fontFamily, "bold");
    this.doc.text(
      "Security Fix Plan Report",
      this.pageWidth / 2,
      this.currentY,
      { align: "center" }
    );

    this.currentY += 15;
    this.doc.setFontSize(this.subtitleSize);
    this.doc.setTextColor(this.mutedTextColor);
    this.doc.setFont(this.fontFamily, "normal");
    this.doc.text(repoName, this.pageWidth / 2, this.currentY, {
      align: "center",
    });

    this.currentY += 20;
    this.doc.setFontSize(this.normalTextSize);
    this.doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      this.pageWidth / 2,
      this.currentY,
      { align: "center" }
    );

    this.doc.addPage();
    this.currentY = this.margin;
  }

  private addMetrics(summary: UnifiedFixPlan["executive_summary"]) {
    if (!summary) return;
    if (summary.total_vulnerabilities !== undefined) {
      this.addMetricBox(
        "Total Vulnerabilities",
        summary.total_vulnerabilities,
        this.dangerColor,
        this.margin,
        this.currentY
      );
    }
    if (summary.fixable_count !== undefined) {
      this.addMetricBox(
        "Fixable",
        summary.fixable_count,
        this.successColor,
        this.margin + this.boxWidth + 2,
        this.currentY
      );
    }
    if (summary.risk_score !== undefined) {
      this.addMetricBox(
        "Risk Score",
        summary.risk_score,
        this.warningColor,
        this.margin + this.boxWidth * 2 + 4,
        this.currentY
      );
    }
    if (summary.estimated_fix_time) {
      this.addMetricBox(
        "Estimated Time",
        summary.estimated_fix_time,
        this.primaryColor,
        this.margin + this.boxWidth * 3 + 6,
        this.currentY
      );
    }
    this.currentY += 30;
  }

  private addBulletList(items: string[], stripMd: boolean = true, isBold: boolean = false) {
    items.forEach((item) => {
      this.addBulletPoint(stripMd ? this.stripMarkdown(item) : item, 5, isBold);
    });
    this.addSpacer(5);
  }

  public generatePDF(
    fixPlan: UnifiedFixPlan,
    repoName: string = "Repository"
  ): jsPDF {
    this.generateCoverPage(repoName);

    // Executive Summary
    if (fixPlan.executive_summary) {
      this.addTitle("Executive Summary");
      this.addSpacer(4);
      this.addMetrics(fixPlan.executive_summary);

      if (fixPlan.executive_summary.critical_insights?.length) {
        this.addSectionHeader("Critical Insights");
        this.addBulletList(fixPlan.executive_summary.critical_insights, true, true);
        this.addSpacer(3);
      }

      if (fixPlan.executive_summary.quick_wins?.length) {
        this.addSectionHeader("Quick Wins");
        this.addBulletList(fixPlan.executive_summary.quick_wins, true, true);
        this.addSpacer(5);
      }
    }

    // Dependency Intelligence
    if (fixPlan.dependency_intelligence) {
      this.addSpacer(10);
      this.addTitle("Dependency Intelligence");
      this.addSpacer(2);

      const intel = fixPlan.dependency_intelligence;

      if (intel.critical_paths?.length) {
        this.addSectionHeader("Critical Dependency Paths");
        this.addBulletList(
          intel.critical_paths.map(
            (p) => `${p.path} - Risk: ${p.risk} | ${p.resolution}`
          ),
          false
        );
        this.addSpacer(4);
      }

      if (intel.shared_transitive_vulnerabilities?.length) {
        this.addSectionHeader("Shared Transitive Vulnerabilities");
        const rows = intel.shared_transitive_vulnerabilities.map((v) => [
          v.package || "",
          String(v.vulnerability_count || 0),
          v.fix || "",
          v.impact_multiplier || "",
        ]);
        this.addTable(
          ["Package", "Vuln Count", "Fix", "Impact"],
          rows,
          [50, 25, 50, 40]
        );
        this.addSpacer(4);
      }

      if (intel.version_conflicts?.length) {
        this.addSectionHeader("Version Conflicts");
        this.addBulletList(
          intel.version_conflicts.map(
            (c) => `${c.conflict} - ${c.resolution} (${c.risk_level})`
          ),
          false
        );
        this.addSpacer(2);
      }

      if (intel.smart_actions?.length) {
        this.addSectionHeader("Smart Actions");
        this.addBulletList(
          intel.smart_actions.map(
            (a) =>
              this.stripMarkdown(`${a.title}: ${a.description} - Impact: ${a.impact} (${a.estimated_time})`)
          ),
          false
        );
        this.addSpacer(5);
      }
    }

    // Priority Phases
    if (fixPlan.priority_phases?.length) {
      this.addSpacer(10);
      this.addTitle("Priority Phases");
      this.addSpacer(2);

      fixPlan.priority_phases.forEach((phase) => {
        this.checkPageBreak(30);
        this.addSectionHeader(
          `Phase ${phase.phase}: ${phase.name} (${phase.urgency})`
        );
        this.addText(
          `Estimated Time: ${phase.estimated_time || "N/A"}`,
          9,
          "#6b7280"
        );
        this.addSpacer(3);

        if (phase.fixes?.length) {
          const rows = phase.fixes.map((fix) => [
            fix.package || "",
            fix.action || "",
            String(fix.risk_score || 0),
            fix.breaking_changes ? "Yes" : "No",
          ]);
          this.addTable(
            ["Package", "Action", "Risk", "Breaking"],
            rows,
            [60, 60, 20, 25]
          );
          this.addSpacer(5);
        }

        if (phase.batch_commands?.length) {
          this.addText("Batch Commands:", this.normalTextSize, this.textColor, true);
          phase.batch_commands.forEach((cmd) => {
            this.doc.setFont(this.codeFont, "bold");
            this.doc.setFontSize(this.codeTextSize);
            this.doc.setTextColor(this.darkTextColor);
            this.checkPageBreak(6);
            this.doc.text(cmd, this.margin + 5, this.currentY);
            this.currentY += 6;
          });
          this.addSpacer(3);
        }

        if (phase.validation_steps?.length) {
          this.addText("Validation Steps:", 10, "#374151", true);
          this.addBulletList(phase.validation_steps, false);
        }

        this.addSpacer(8);
      });
    }

    // Risk Management
    if (fixPlan.risk_management) {
      this.addSpacer(10);
      this.addTitle("Risk Management");
      this.addSpacer(2);

      const risk = fixPlan.risk_management;

      if (risk.overall_assessment) {
        this.addSectionHeader("Overall Assessment");
        this.addText(this.stripMarkdown(risk.overall_assessment));
        this.addSpacer(3);
      }

      if (risk.breaking_changes_summary) {
        this.addSectionHeader("Breaking Changes Summary");
        const bc = risk.breaking_changes_summary;
        this.addText(
          `Has Breaking Changes: ${bc.has_breaking_changes ? "Yes" : "No"}`,
          10,
          bc.has_breaking_changes ? this.dangerColor : this.successColor,
          true
        );
        if (bc.count) this.addText(`Count: ${bc.count}`);
        if (bc.mitigation_steps?.length) {
          this.addText("Mitigation Steps:", 10, "#374151", true);
          this.addBulletList(bc.mitigation_steps, false);
        }
        this.addSpacer(2);
      }

      if (risk.testing_strategy) {
        this.addSectionHeader("Testing Strategy");
        const t = risk.testing_strategy;
        if (t.unit_tests) this.addText(`Unit Tests: ${t.unit_tests}`, 9);
        if (t.integration_tests)
          this.addText(`Integration Tests: ${t.integration_tests}`, 9);
        if (t.security_validation)
          this.addText(`Security Validation: ${t.security_validation}`, 9);
        this.addSpacer(3);
      }

      if (risk.monitoring_recommendations?.length) {
        this.addSectionHeader("Monitoring Recommendations");
        this.addBulletList(risk.monitoring_recommendations, false);
        this.addSpacer(5);
      }
    }

    // Long-term Strategy
    if (fixPlan.long_term_strategy) {
      this.addSpacer(10);
      this.addTitle("Long-term Strategy");
      this.addSpacer(2);

      const strategy = fixPlan.long_term_strategy;

      if (strategy.preventive_measures?.length) {
        this.addSectionHeader("Preventive Measures");
        this.addBulletList(strategy.preventive_measures, false);
        this.addSpacer(2);
      }

      if (strategy.dependency_policies?.length) {
        this.addSectionHeader("Dependency Policies");
        this.addBulletList(strategy.dependency_policies, false);
        this.addSpacer(2);
      }

      if (strategy.automation_opportunities?.length) {
        this.addSectionHeader("Automation Opportunities");
        this.addBulletList(strategy.automation_opportunities, false);
      }
    }

    return this.doc;
  }
}