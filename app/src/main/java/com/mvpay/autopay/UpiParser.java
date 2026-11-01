package com.mvpay.autopay;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class UpiParser {

    public static class ParsedPayment {
        public boolean isCredit;
        public double amount;
        public String utr;
        public String rawText;

        public ParsedPayment(boolean isCredit, double amount, String utr, String rawText) {
            this.isCredit = isCredit;
            this.amount = amount;
            this.utr = utr;
            this.rawText = rawText;
        }
    }

    // Patterns to detect credit vs debit
    private static final Pattern CREDIT_PATTERN = Pattern.compile(
            "(?i)(received|credited|deposit|sent you|added to|payment of|paid you|received from)"
    );

    private static final Pattern DEBIT_PATTERN = Pattern.compile(
            "(?i)(debited|sent to|transferred to|paid to|spent|withdrawn)"
    );

    // Amount extraction pattern: ₹100, Rs. 100, INR 100, 100.00
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?:₹|Rs\\.?|INR|\\bRs)\\s*([\\d,]+(?:\\.\\d{1,2})?)|(?:received|credited|paid)\\s*(?:₹|Rs\\.?|INR)?\\s*([\\d,]+(?:\\.\\d{1,2})?)",
            Pattern.CASE_INSENSITIVE
    );

    // 12-digit UTR pattern: UPI Reference Number is standard 12 digits
    private static final Pattern UTR_EXPLICIT_PATTERN = Pattern.compile(
            "(?i)(?:UTR|ref(?:erence)?(?:\\s*no\\.?)?|txn(?:id)?|txnid|rrn)\\s*[:\\-#]?\\s*([a-zA-Z0-9]{8,20})"
    );

    private static final Pattern UTR_12_DIGIT_PATTERN = Pattern.compile(
            "\\b(\\d{12})\\b"
    );

    public static ParsedPayment parse(String title, String content) {
        String combined = ((title != null ? title : "") + " " + (content != null ? content : "")).trim();
        if (combined.isEmpty()) {
            return null;
        }

        // Check if debit -> ignore immediately to prevent false triggers
        Matcher debitMatcher = DEBIT_PATTERN.matcher(combined);
        if (debitMatcher.find()) {
            // Check if it also says received/credited
            Matcher creditMatcher = CREDIT_PATTERN.matcher(combined);
            if (!creditMatcher.find()) {
                return null;
            }
        }

        Matcher creditMatcher = CREDIT_PATTERN.matcher(combined);
        boolean isCredit = creditMatcher.find();

        // Extract Amount
        double amount = 0.0;
        Matcher amountMatcher = AMOUNT_PATTERN.matcher(combined);
        if (amountMatcher.find()) {
            String valStr = amountMatcher.group(1);
            if (valStr == null || valStr.isEmpty()) {
                valStr = amountMatcher.group(2);
            }
            if (valStr != null) {
                try {
                    valStr = valStr.replace(",", "").trim();
                    amount = Double.parseDouble(valStr);
                } catch (Exception ignored) {
                }
            }
        }

        // If no amount found, check general number
        if (amount <= 0.0) {
            Pattern fallbackAmount = Pattern.compile("(?i)(?:amount|inr|rs)\\s*[:\\-]?\\s*([\\d,]+(?:\\.\\d{1,2})?)");
            Matcher fm = fallbackAmount.matcher(combined);
            if (fm.find()) {
                try {
                    String s = fm.group(1).replace(",", "").trim();
                    amount = Double.parseDouble(s);
                } catch (Exception ignored) {}
            }
        }

        // Extract UTR / Reference ID
        String utr = "";
        Matcher utrMatcher = UTR_EXPLICIT_PATTERN.matcher(combined);
        if (utrMatcher.find()) {
            utr = utrMatcher.group(1).trim();
        } else {
            Matcher digitMatcher = UTR_12_DIGIT_PATTERN.matcher(combined);
            if (digitMatcher.find()) {
                utr = digitMatcher.group(1).trim();
            }
        }

        // If it's a credit and has an amount or UTR, it's a valid payment alert
        if (amount > 0.0 || !utr.isEmpty()) {
            return new ParsedPayment(isCredit, amount, utr, combined);
        }

        return null;
    }
}
