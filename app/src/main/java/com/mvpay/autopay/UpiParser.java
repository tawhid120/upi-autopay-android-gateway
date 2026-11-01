package com.mvpay.autopay;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class UpiParser {

    public static class ParsedPayment {
        public boolean isCredit;
        public double amount;
        public String utr;
        public String provider;
        public String payer;
        public String rawText;

        public ParsedPayment(boolean isCredit, double amount, String utr, String provider, String payer, String rawText) {
            this.isCredit = isCredit;
            this.amount = amount;
            this.utr = utr;
            this.provider = provider;
            this.payer = payer;
            this.rawText = rawText;
        }
    }

    // Patterns to detect credit vs debit
    private static final Pattern CREDIT_PATTERN = Pattern.compile(
            "(?i)(received|credited|deposit|sent you|added to|payment of|paid you|received from|received payment|credited by|credited to)"
    );

    private static final Pattern DEBIT_PATTERN = Pattern.compile(
            "(?i)(debited|sent to|transferred to|paid to|spent|withdrawn|money sent)"
    );

    // Amount extraction patterns:
    // ₹100, Rs. 100, INR 100, Rs 1,500.00, received Tk / Rs / INR 500
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?:₹|Rs\\.?|INR|\\bRs)\\s*([\\d,]+(?:\\.\\d{1,2})?)|(?:received|credited|paid|deposit of)\\s*(?:₹|Rs\\.?|INR)?\\s*([\\d,]+(?:\\.\\d{1,2})?)",
            Pattern.CASE_INSENSITIVE
    );

    // Explicit UTR / Reference ID patterns:
    // "UTR: 123456789012", "Ref No: 123456789012", "RRN: 123456789012", "UPI Ref 123456789012", "Txn ID: 123456789012"
    private static final Pattern UTR_EXPLICIT_PATTERN = Pattern.compile(
            "(?i)(?:UTR|ref(?:erence)?(?:\\s*no\\.?)?|rrn|txn(?:id)?|txnid|transaction\\s*id)\\s*[:\\-#]?\\s*([a-zA-Z0-9]{8,22})"
    );

    // Standard 12-digit Indian UPI Reference Number (RRN)
    private static final Pattern UTR_12_DIGIT_PATTERN = Pattern.compile(
            "\\b(\\d{12})\\b"
    );

    // Payer extraction: "from John Doe", "by Rahul"
    private static final Pattern PAYER_PATTERN = Pattern.compile(
            "(?i)(?:from|by)\\s+([a-zA-Z0-9\\.\\-_@ ]{2,30}?)(?:\\s+(?:via|on|ref|utr|rrn|to|using|in)|$|\\.)"
    );

    public static String detectProvider(String title, String content, String packageName) {
        String combined = ((title != null ? title : "") + " " + (content != null ? content : "") + " " + (packageName != null ? packageName : "")).toUpperCase();
        if (combined.contains("FAMPAY") || combined.contains("FAM")) return "FamPay";
        if (combined.contains("PHONEPE")) return "PhonePe";
        if (combined.contains("PAYTM")) return "Paytm";
        if (combined.contains("GPAY") || combined.contains("GOOGLE PAY") || combined.contains("PAISA") || combined.contains("TEZ")) return "Google Pay";
        if (combined.contains("BHIM")) return "BHIM UPI";
        if (combined.contains("CRED")) return "CRED";
        if (combined.contains("SBI") || combined.contains("YONO")) return "SBI Bank";
        if (combined.contains("HDFC")) return "HDFC Bank";
        if (combined.contains("ICICI")) return "ICICI Bank";
        if (combined.contains("AXIS")) return "Axis Bank";
        if (combined.contains("KOTAK")) return "Kotak Bank";
        if (combined.contains("PNB")) return "PNB Bank";
        if (combined.contains("BOB") || combined.contains("BARODA")) return "Bank of Baroda";
        if (combined.contains("CANARA")) return "Canara Bank";
        if (combined.contains("IDFC")) return "IDFC FIRST Bank";
        return "UPI Payment";
    }

    public static ParsedPayment parse(String title, String content, String packageName) {
        String combined = ((title != null ? title : "") + " " + (content != null ? content : "")).trim();
        if (combined.isEmpty()) {
            return null;
        }

        // 1. Debit check
        Matcher debitMatcher = DEBIT_PATTERN.matcher(combined);
        if (debitMatcher.find()) {
            Matcher creditMatcher = CREDIT_PATTERN.matcher(combined);
            if (!creditMatcher.find()) {
                return null;
            }
        }

        Matcher creditMatcher = CREDIT_PATTERN.matcher(combined);
        boolean isCredit = creditMatcher.find();

        // 2. Extract Amount
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
                } catch (Exception ignored) {}
            }
        }

        // Fallback amount check: "amount Rs 500"
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

        // 3. Extract UTR / RRN (12-digit standard)
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

        // 4. Extract Provider Name
        String provider = detectProvider(title, content, packageName);

        // 5. Extract Payer (Optional)
        String payer = "";
        Matcher payerMatcher = PAYER_PATTERN.matcher(combined);
        if (payerMatcher.find()) {
            payer = payerMatcher.group(1).trim();
            if (payer.length() > 25) {
                payer = payer.substring(0, 25).trim();
            }
        }

        // If it's a credit and has an amount or UTR, it's a valid payment alert
        if (amount > 0.0 || !utr.isEmpty()) {
            return new ParsedPayment(isCredit, amount, utr, provider, payer, combined);
        }

        return null;
    }
}
