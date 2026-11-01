package com.mvpay.autopay;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "upi_gateway.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_TX = "pending_transactions";
    public static final String COL_ID = "id";
    public static final String COL_PACKAGE = "package_name";
    public static final String COL_SENDER = "sender";
    public static final String COL_TITLE = "title";
    public static final String COL_CONTENT = "content";
    public static final String COL_AMOUNT = "amount";
    public static final String COL_UTR = "utr";
    public static final String COL_TIMESTAMP = "timestamp";
    public static final String COL_STATUS = "status"; // PENDING, SYNCED
    public static final String COL_CREATED_AT = "created_at";

    private static DatabaseHelper instance;

    public static synchronized DatabaseHelper getInstance(Context context) {
        if (instance == null) {
            instance = new DatabaseHelper(context.getApplicationContext());
        }
        return instance;
    }

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String createTable = "CREATE TABLE " + TABLE_TX + " (" +
                COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COL_PACKAGE + " TEXT, " +
                COL_SENDER + " TEXT, " +
                COL_TITLE + " TEXT, " +
                COL_CONTENT + " TEXT, " +
                COL_AMOUNT + " REAL, " +
                COL_UTR + " TEXT, " +
                COL_TIMESTAMP + " INTEGER, " +
                COL_STATUS + " TEXT DEFAULT 'PENDING', " +
                COL_CREATED_AT + " INTEGER" +
                ")";
        db.execSQL(createTable);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_TX);
        onCreate(db);
    }

    public synchronized long insertTransaction(String packageName, String sender, String title, String content,
                                               double amount, String utr, long timestamp, String status) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put(COL_PACKAGE, packageName);
        cv.put(COL_SENDER, sender);
        cv.put(COL_TITLE, title);
        cv.put(COL_CONTENT, content);
        cv.put(COL_AMOUNT, amount);
        cv.put(COL_UTR, utr);
        cv.put(COL_TIMESTAMP, timestamp);
        cv.put(COL_STATUS, status);
        cv.put(COL_CREATED_AT, System.currentTimeMillis());
        return db.insert(TABLE_TX, null, cv);
    }

    public static class TransactionItem {
        public long id;
        public String packageName;
        public String sender;
        public String title;
        public String content;
        public double amount;
        public String utr;
        public long timestamp;
        public String status;
        public long createdAt;
    }

    public synchronized List<TransactionItem> getPendingTransactions() {
        List<TransactionItem> list = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM " + TABLE_TX + " WHERE " + COL_STATUS + " = 'PENDING' ORDER BY " + COL_ID + " ASC", null);

        if (cursor != null) {
            try {
                while (cursor.moveToNext()) {
                    TransactionItem item = new TransactionItem();
                    item.id = cursor.getLong(cursor.getColumnIndexOrThrow(COL_ID));
                    item.packageName = cursor.getString(cursor.getColumnIndexOrThrow(COL_PACKAGE));
                    item.sender = cursor.getString(cursor.getColumnIndexOrThrow(COL_SENDER));
                    item.title = cursor.getString(cursor.getColumnIndexOrThrow(COL_TITLE));
                    item.content = cursor.getString(cursor.getColumnIndexOrThrow(COL_CONTENT));
                    item.amount = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_AMOUNT));
                    item.utr = cursor.getString(cursor.getColumnIndexOrThrow(COL_UTR));
                    item.timestamp = cursor.getLong(cursor.getColumnIndexOrThrow(COL_TIMESTAMP));
                    item.status = cursor.getString(cursor.getColumnIndexOrThrow(COL_STATUS));
                    item.createdAt = cursor.getLong(cursor.getColumnIndexOrThrow(COL_CREATED_AT));
                    list.add(item);
                }
            } finally {
                cursor.close();
            }
        }
        return list;
    }

    public synchronized void markAsSynced(long id) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put(COL_STATUS, "SYNCED");
        db.update(TABLE_TX, cv, COL_ID + " = ?", new String[]{String.valueOf(id)});
    }

    public synchronized void deleteTransaction(long id) {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_TX, COL_ID + " = ?", new String[]{String.valueOf(id)});
    }

    public synchronized void deleteByUtr(String utr) {
        if (utr == null || utr.trim().isEmpty()) return;
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_TX, COL_UTR + " = ?", new String[]{utr.trim()});
    }

    public synchronized int getPendingCount() {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_TX + " WHERE " + COL_STATUS + " = 'PENDING'", null);
        int count = 0;
        if (cursor != null) {
            try {
                if (cursor.moveToFirst()) {
                    count = cursor.getInt(0);
                }
            } finally {
                cursor.close();
            }
        }
        return count;
    }

    public synchronized void clearAll() {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_TX, null, null);
    }
}
